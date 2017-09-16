(function() {
    'use strict'
    var views = [
    {
        left: 0,
        bottom: 0,
        width: 0.5,
        height: 1.0,

        // updated in window resize
        window: {
            left: 0,
            bottom: 0,
            width: 0.5,
            height: 1.0
        },

        // background: new THREE.Color().setRGB( 0.5, 0.5, 0.7 )
        background: new THREE.Color().setRGB( 0.9, 0.9, 0.9 )
        // background: new THREE.Color().setRGB( 1, 1, 1 )
    },

    {
        left: 0.5,
        bottom: 0,
        width: 0.5,
        height: 1.0,

        // updated in window resize
        window: {
            left: 0,
            bottom: 0,
            width: 0.5,
            height: 1.0
        },

        // background: new THREE.Color().setRGB( 0.5, 0.5, 0.7 )
        background: new THREE.Color().setRGB( 0.9, 0.9, 0.9 )
        // background: new THREE.Color().setRGB( 1, 1, 1 )
    }
    ];
    var canvas,idx_canvas;
    var ctx;
    var scene1,scene2;
    var camera;
    var renderer;
    //view1
    var mesh;
    var Geometry_EdgeHelper=[],RenderGeometry=[],RenderMesh=[];
    var LineRenderMaterial= new THREE.LineBasicMaterial({
        vertexColors: true
      });
    var dualGeometry=[], Renderdualline=[];
    var FaceRenderMaterial=new THREE.MeshBasicMaterial({
        color: 0x156289, 
        opacity: 0.1,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    } )
    var FaceRenderMaterial_Selected=new THREE.MeshBasicMaterial( { 
        color: 0xe46a6a, 
        opacity: 0.1,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    })
    var PointRenderMaterial=new THREE.PointsMaterial( { 
        size: 8, 
        sizeAttenuation: false,
        color: 0xFF0000 });
    var datgui;
    var axis;
    var Mouse1,Mouse2;
    var orbit;
    var guiList={
        LoadGeometry:undefined,
    };
    var highlight_edge=undefined;
    var highlight_face=undefined;
    var highlight_point=undefined;
    var highlight_edge_id=undefined;
    var highlight_face_id=undefined;
    var highlight_point_id=undefined;

    var highlight_Cell_id=0;
    var mesh_scale=0;
    var dual_scale=0;


    function readJson(event)
    {
        'use strict'
        var files_list=event.target.files;
        var reader= new FileReader();
        var file=files_list[0];

        reader.readAsText(file, "UTF-8");
        reader.onload=buildMeshStructure;
    }
    function updateDualStructure(){
        if(mesh.internal_dual_edge_map.length==0) return;
        scene1=new THREE.Scene;
        views[0].scene=scene1;
        dualGeometry=[];
        Renderdualline=[];
        highlight_Cell_id=0;

        //show dual structure
        for(var e in mesh.internal_dual_edge_map)
        {
            dualGeometry[e]=new THREE.Geometry();
            var index1=mesh.internal_dual_edge_map[e].c_p.x;
            var index2=mesh.internal_dual_edge_map[e].c_p.y;
            dualGeometry[e].vertices.push(new THREE.Vector3().copy(mesh.mesh_cell[index1].dual_pos));
            dualGeometry[e].vertices.push(new THREE.Vector3().copy(mesh.mesh_cell[index2].dual_pos));
            if(mesh.internal_dual_edge_map[e].length>=0)
                dualGeometry[e].colors.push(new THREE.Color( 0x156289 ),new THREE.Color( 0x156289 ));
            else
                dualGeometry[e].colors.push(new THREE.Color( 0xFF0000 ),new THREE.Color( 0xFF0000 ));
            dualGeometry[e].translate(-mesh.dual_geo_center.x,-mesh.dual_geo_center.y,-mesh.dual_geo_center.z);   
            dualGeometry[e].scale(dual_scale,dual_scale,dual_scale);             
            Renderdualline[e]=new THREE.Line(dualGeometry[e],LineRenderMaterial,THREE.LineSegments);
            scene1.add(Renderdualline[e]);        
        }
        //draw external dual edge;
        for(var c in mesh.mesh_cell)
        {
            if(mesh.mesh_cell[c].external_dual_edge.length>0)
            {
                for(var e in mesh.mesh_cell[c].external_dual_edge)
                {
                    var idx=dualGeometry.length;
                    dualGeometry[idx] = new THREE.Geometry();
                    var e_v1=new THREE.Vector3().copy(mesh.mesh_cell[c].dual_pos);
                    var e_v2=new THREE.Vector3().addVectors(e_v1,mesh.mesh_cell[c].external_dual_edge[e]);
                    dualGeometry[idx].vertices.push(e_v1);
                    dualGeometry[idx].vertices.push(e_v2);
                    dualGeometry[idx].colors.push(new THREE.Color( 0x7FFF00 ),new THREE.Color( 0x7FFF00 ));
                    dualGeometry[idx].translate(-mesh.dual_geo_center.x,-mesh.dual_geo_center.y,-mesh.dual_geo_center.z);   
                    dualGeometry[idx].scale(dual_scale,dual_scale,dual_scale);
                    Renderdualline[idx] = new THREE.Line(dualGeometry[idx],LineRenderMaterial,THREE.LineSegments);
                    scene1.add(Renderdualline[idx]);
                }
            }
        }

    }
    function drawMesh()
    {
        if(!mesh.mesh_half_face) alert("Half_Face structure errors!");
        var vert_Group=[];
        for(var v in mesh.mesh_vertex)
        {
            var vert=new THREE.Vector3().subVectors(mesh.mesh_vertex[v].pos,mesh.mesh_cell[mesh.external_cell_ID].center_pos);
            vert.multiplyScalar(mesh_scale);
            vert_Group.push(vert);
        }

        for(var c in mesh.mesh_cell)
        {
            var idx=[];
            for(var f in mesh.mesh_cell[c].hfs)
            {
                var target_hf=mesh.mesh_cell[c].hfs[f];
                var start=target_hf.vertices[0].id;
                for(var v=1;v<target_hf.vertices.length-1;v++)
                    idx.push(new THREE.Face3(start, target_hf.vertices[v].id, target_hf.vertices[v+1].id));
            }
            RenderGeometry[c]= new THREE.Geometry();  
            RenderGeometry[c].vertices=vert_Group;
            RenderGeometry[c].faces=idx;
            RenderMesh[c]= new THREE.Mesh(RenderGeometry[c],FaceRenderMaterial);
            if(c==highlight_Cell_id) RenderMesh[c].material=FaceRenderMaterial_Selected;
            scene2.add(RenderMesh[c]);
        }
    }
    function buildMeshStructure(event)
    {
        //ReInitialize
        //var vertex_edge_map=[];//Used to record the edges start from each point
        // var h_id=0,e_id=0;
        var json=JSON.parse(event.target.result);
        RenderGeometry=[];
        RenderMesh=[];
        dualGeometry=[];
        Renderdualline=[];
        mesh.clear();
        scene1=new THREE.Scene;
        scene2=new THREE.Scene;
        views[0].scene=scene1;
        views[1].scene=scene2;
        mesh_scale=0;
        dual_scale=0;


        mesh.buildHalfFace(json.vertices,json.edges,json.face_vertices,json.face_edges);
        mesh.findAxis();
        mesh.Produce_dual_structure();

        //Rescale Geometry
        var mesh_range=new THREE.Vector3().subVectors(mesh.bound[1],mesh.bound[0]);
        var dual_range=new THREE.Vector3().subVectors(mesh.dual_bound[1],mesh.dual_bound[0]);
        var mesh_aspect=views[1].window.width / views[1].window.height;
        var dual_aspect=views[0].window.width / views[0].window.height;
        if(mesh_aspect<=1)
            mesh_scale=camera.position.z*Math.tan(camera.fov/360*Math.PI)/mesh_range.length();
        else
            mesh_scale=camera.position.z*Math.tan(camera.fov/360*Math.PI)/(mesh_aspect*mesh_range.length());
        if(dual_aspect<=1)
            dual_scale=camera.position.z*Math.tan(camera.fov/360*Math.PI)/dual_range.length();
        else
            dual_scale=camera.position.z*Math.tan(camera.fov/360*Math.PI)/(dual_aspect*dual_range.length());
        drawMesh();
        updateDualStructure();
        console.log(mesh);
        

  
    }
    function Execute_Barycentric_Subdivision()
    {
        // if(highlight_face_id==undefined)
        //     return;
        // var start=mesh.mesh_face[highlight_face_id].startedge;
        // var he=start;
        // var num=RenderGeometry.length;

        // do
        // {
        //     RenderGeometry[num]=new THREE.Geometry();
        //     RenderGeometry[num].vertices.push(mesh.mesh_face[highlight_face_id].center_pos);
        //     RenderGeometry[num].vertices.push(he.vert.pos);
        //     RenderGeometry[num].colors.push(new THREE.Color( 0x156289 ),new THREE.Color( 0x156289 ));
        //     Renderline[num]=new THREE.Line(RenderGeometry[num],LineRenderMaterial,THREE.LineSegments);
        //     scene2.add(Renderline[num]);
        //     he=he.next;
        // }while(he!=start);

        // mesh.BaryCentricSubdivision(highlight_face_id);

        // //Do this to make sure the hightlight elements are the last to be rendered.
        // scene2.remove(highlight_edge);
        // scene2.remove(highlight_face);
        // scene2.remove(highlight_point);

        // highlight_edge=new THREE.Line();
        // highlight_edge.material=LineRenderMaterial;
        // highlight_edge.geometry=new THREE.Geometry();
        // highlight_edge.geometry.colors.push(new THREE.Color(0xFFFF00),new THREE.Color(0xFF0000));
        // highlight_point=new THREE.Points();
        // highlight_point.material=PointRenderMaterial;

        // scene2.add(highlight_edge);
        // scene2.add(highlight_face);
        // scene2.add(highlight_point);

        // updateDualStructure();
        // console.log(mesh);

    }
    function keyEvent(event)
    {
        var keynum= window.event ? event.keyCode : event.which;
        var keychar = String.fromCharCode(keynum);
        if(keychar=='N')
        {
            RenderMesh[highlight_Cell_id].material=FaceRenderMaterial;
            highlight_Cell_id++;
            if(highlight_Cell_id==mesh.mesh_cell.length) highlight_Cell_id=0;
            RenderMesh[highlight_Cell_id].material=FaceRenderMaterial_Selected;
            console.log("here");
        }

    }
    // function onMouseMove( event ) {
    //     'use strict'
    //     event.preventDefault();
    //     mouseScene1.x = ( event.clientX / window.innerWidth * 2 ) * 2 - 1;
    //     mouseScene1.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    //     mouseScene2.x = mouseScene1.x - 2;
    //     mouseScene2.y = mouseScene1.y;

    //     mousePositionDirty = true;

    // }
    function viewResize(){
        'use strict'
        renderer.setSize(window.innerWidth, window.innerHeight);
        var view;
        for ( var ii = 0; ii < views.length; ++ii ) {
            view = views[ii];

            view.window.left   = Math.floor( window.innerWidth  * view.left );
            view.window.bottom = Math.floor( window.innerHeight * view.bottom );
            view.window.width  = Math.floor( window.innerWidth  * view.width );
            view.window.height = Math.floor( window.innerHeight * view.height );
        }

    }
    function animate()
    {
        requestAnimationFrame( animate );
        render();
    }
    function render(){
        'use strict'      
        // ray caster temp test
        //pick();
        renderer.clear();

        var view;
        for ( var ii = 0; ii < views.length; ++ii ) {
            view = views[ii];

            renderer.setViewport( view.window.left, view.window.bottom, view.window.width, view.window.height );
            renderer.setScissor( view.window.left, view.window.bottom, view.window.width, view.window.height );
            renderer.setScissorTest( true );
            renderer.setClearColor( view.background );
            camera.aspect = view.window.width / view.window.height;
            camera.updateProjectionMatrix();
            renderer.render( view.scene, camera );
        }
    }
    window.onload = function(){
        'use strict'
        //Define event
        window.addEventListener('resize', viewResize, false);
        document.getElementById('files').addEventListener('change', readJson, false);
        document.addEventListener('keydown',keyEvent,false);
        //Assign value for varables
        canvas = document.getElementById('WebGl_Canvas');
        idx_canvas=document.getElementById('Idx_Canvas');
        ctx=idx_canvas.getContext("2d");
        scene1=new THREE.Scene;
        scene2=new THREE.Scene;
        views[0].scene=scene1;
        views[1].scene=scene2;

        Mouse1 = new THREE.Vector2();
        Mouse2 = new THREE.Vector2();

        camera=new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 50000);
        console.log(camera);
        renderer=new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );
        renderer.setClearColor(new THREE.Color().setRGB( 0.9, 0.9, 0.9 ));
        renderer.setPixelRatio(window.devicePixelRatio);

        mesh=new Mesh();

        camera.position.x=0;
        camera.position.y=0;
        camera.position.z=100;

       
        orbit = new THREE.OrbitControls( camera, renderer.domElement);

        //Gui Initialization
        guiList.LoadGeometry={
            Load_geometry_file: function(){
                 document.getElementById("files").click();
            }
        }
        // guiList.Barycentric_Subdivision={
        //     Barycentric_Subdiv: Execute_Barycentric_Subdivision
        // }
        datgui=new dat.GUI();
        datgui.add(guiList.LoadGeometry,'Load_geometry_file');
        // datgui.add(guiList.Barycentric_Subdivision,'Barycentric_Subdiv');

        
        viewResize();
        animate();
    	//renderer.render(scene,camera);

    }
})();
    
