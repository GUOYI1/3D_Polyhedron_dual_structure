
function Half_Face_SortAngle(targetHF,halfFaceArray,ref_axis_p1,ref_axis_p2){
	'use strict'
    var min_element=-1;
	var max_element=-1;
	var min_angle=10;
	var max_angle=-10;
	var tar_Vector=Get_Perpendicular_Vector(ref_axis_p1,ref_axis_p2,new THREE.Vector3().copy(targetHF.center_pos))
	var ref_axis=new THREE.Vector3().subVectors(ref_axis_p2,ref_axis_p1);
	for(var e in halfFaceArray)
	{
		if(targetHF.sym_face==halfFaceArray[e]) continue;
		var v=Get_Perpendicular_Vector(ref_axis_p1,ref_axis_p2, new THREE.Vector3().copy(halfFaceArray[e].center_pos));
		var angle=Math.acos(tar_Vector.dot(v));
		var axis=new THREE.Vector3().crossVectors(tar_Vector,v);		
		if(axis.length()!=0 && axis.dot(ref_axis) > 0)
			angle=2.0*Math.PI-angle;
		if(angle<min_angle)
        {
            min_angle=angle;
            min_element=e;
        }
        if(angle>max_angle)
        {
        	max_angle=angle;
        	max_element=e;
        }
	}

	return new THREE.Vector2(min_element,max_element);
}
function ConstructSingleCell(half_face){
	'use strict'
    if(half_face.cell==undefined)
		return;
	for(var f in half_face.adjacent_faces)
	{
		if(half_face.adjacent_faces[f].hf.cell==undefined)
		{
			half_face.adjacent_faces[f].hf.cell=half_face.cell;
			half_face.cell.hfs.push(half_face.adjacent_faces[f].hf);
			for(var v in half_face.adjacent_faces[f].hf.vertices)
				half_face.cell.vertices.push(half_face.adjacent_faces[f].hf.vertices[v].id);
			ConstructSingleCell(half_face.adjacent_faces[f].hf);
		}
	}
}
function Cell(id){
	this.id=undefined;
	if(id!=undefined)
		this.id=parseInt(id);
	this.hfs=[];
	this.vertices=[];
    
    this.volume=undefined;
	this.center_pos=undefined;
    this.dual_pos=undefined;
    this.external_dual_edge=[];
}
function Cell_Pair(){
    this.c_p=undefined;
    this.dual_edge_ID=undefined;
}
function Half_Face(id){
	this.id=undefined;
	if(id!=undefined)
		this.id=parseInt(id);
	this.sym_face=undefined;
	this.vertices=[];	//sorted vertices indexs 
	// adjacent half_faces,each adjacent face pair share one edge with opposite direction.
	this.adjacent_faces=[];
	this.cell=undefined;

    this.external_surface=false;
	this.center_pos=undefined;
    this.area=undefined;
}
function Adajacent_Obj(){
	this.hf=undefined;	//record one of the half_face of the target face
	this.hl=undefined;	//one of the half edges of the edge that is shared;
}
function Half_Edge(id){
	this.id=undefined;
	if(id!=undefined)
		this.id=parseInt(id);
	this.sym=undefined;
	this.vert=undefined;
	this.hfs=[];
}
function internal_axis(){
    this.Sort_Cell_ID=[];
    this.cell_pair=[];
    this.hl=undefined;
}
function external_axis(){
    this.hl=undefined;
}

function Vertex(id){
	this.id=undefined;
	if(id!=undefined)
		this.id=parseInt(id);
	this.pos=undefined;	
    this.external=false;
}
function Direction_Map_Obj(){
    this.c_p=undefined;
    this.id=undefined;
    this.direction_vector=undefined;
    this.thick_value=undefined;
    this.length=0;
}
function Mesh(){
	this.mesh_vertex=[];
	this.mesh_half_edge=[];
	this.mesh_half_face=[];
	this.mesh_cell=[];
	this.half_face_finished=false;
    this.external_cell_ID=undefined;
    this.dual_finished=false;
    this.dual_geo_center=new THREE.Vector3();


	this.bound=[new THREE.Vector3(),new THREE.Vector3()];
	this.dual_bound=[new THREE.Vector3,new THREE.Vector3()];

    this.in_axis=[];
    this.ex_axis=[];

    this.internal_dual_edge_map=[];

}
Mesh.prototype.buildHalfFace=function(vertices,edges,face_vertices,face_edges){

	'use strict'
    if(face_vertices.length!=face_edges.length)
    {
        alert("Data Error");
        return;
    }
    //read vertices
    for(var v in vertices)
    {
        this.mesh_vertex[v]=new Vertex(v);
        this.mesh_vertex[v].pos=new THREE.Vector3(
            vertices[v][0],
            vertices[v][1],
            vertices[v][2]); 
        if(v==0)
        {
            this.bound[0].x=vertices[v][0];
            this.bound[0].y=vertices[v][1];
            this.bound[0].z=vertices[v][2];
            this.bound[1].x=vertices[v][0];
            this.bound[1].y=vertices[v][1];
            this.bound[1].z=vertices[v][2];
        }
        else
        {
            if(vertices[v][0]<this.bound[0].x)
                this.bound[0].x=vertices[v][0]
            else if(vertices[v][0]>this.bound[1].x)
                this.bound[1].x=vertices[v][0];

            if(vertices[v][1]<this.bound[0].y)
                this.bound[0].y=vertices[v][1];
            else if(vertices[v][1]>this.bound[1].y)
                this.bound[1].y=vertices[v][1];

            if(vertices[v][2]<this.bound[0].z)
                this.bound[0].z=vertices[v][2]
            else if(vertices[v][2]>this.bound[1].z)
                this.bound[1].z=vertices[v][2];
        }
    }
    

    //read edges

    for(var e in edges)
    {
        if(edges[e][0]!=undefined && edges[e][1]!=undefined)
        {
            var hla=new Half_Edge(2*e);
            var hlb=new Half_Edge(2*e+1);
            hla.sym=hlb;
            hlb.sym=hla;
            hla.vert=this.mesh_vertex[edges[e][0]];
            hlb.vert=this.mesh_vertex[edges[e][1]];
            this.mesh_half_edge.push(hla);
            this.mesh_half_edge.push(hlb);

        }
    }

    //Read Face vertices
    for(var e in face_vertices)
    {
        // var f=new Face(e);
        var hfa=new Half_Face(2*e);
        var hfb=new Half_Face(2*e+1);
        var v_Array_Reverse=face_vertices[e].slice(0).reverse();
        var center=new THREE.Vector3();
        var v_Group=[];
        for(var i in face_vertices[e]){
            hfa.vertices.push(this.mesh_vertex[face_vertices[e][i]]);
            hfb.vertices.push(this.mesh_vertex[v_Array_Reverse[i]]);
            center.add(this.mesh_vertex[face_vertices[e][i]].pos)
            v_Group.push(this.mesh_vertex[face_vertices[e][i]].pos);
        }
        center.divideScalar(face_vertices[e].length);
        
        hfa.sym_face=hfb;
        hfb.sym_face=hfa;
        hfa.area=ComputePolygonArea(v_Group,center);
        hfb.area=hfa.area;
        //A pair of half faces share the same center_pos
        hfa.center_pos=center;
        hfb.center_pos=hfa.center_pos;
        this.mesh_half_face.push(hfa);
        this.mesh_half_face.push(hfb);
    }

    //Find all the half_faces connected to each half_edge
    for(var e in face_edges)
    {
        for(var i in face_edges[e])
        {
            var l=this.mesh_half_edge[2*face_edges[e][i]];
            var f=this.mesh_half_face[2*e]
            var v=l.vert;

            var idx = f.vertices.findIndex(function(x){
                return x.id==v.id;
            })
            var pre_idx=-1;
            if(idx==-1)
            {
                alert("Mesh Error");
                return;
            }
            if(idx==0) pre_idx=f.vertices.length-1;
            else pre_idx=idx-1;
            if(f.vertices[pre_idx].id==l.sym.vert.id)
             {
                l.hfs.push(f);
                l.sym.hfs.push(f.sym_face);
             }   
            else
            {                                  
                l.sym.hfs.push(f);
                l.hfs.push(f.sym_face);
            }

        }
    }
    //find adjacent faces
    //Time Complexity O(n^3),still finding a way to optimize it.
    for(var e=0; e<this.mesh_half_edge.length/2;e++)
    {
        var he=this.mesh_half_edge[2*e];
        //Sort the face around the half_edge
        var startFace=he.hfs[0];
        var new_hfs=[];
        var new_sym_hfs=[];
        do
        {
            var adj_idx=Half_Face_SortAngle(startFace,he.sym.hfs,new THREE.Vector3().copy(he.sym.vert.pos),
                new THREE.Vector3().copy(he.vert.pos));
            var idx1=adj_idx.x;
            if(idx1!=-1)
            {
                var adj_obj1=new Adajacent_Obj();
                var adj_obj2=new Adajacent_Obj();
                adj_obj1.hf=he.sym.hfs[idx1];
                adj_obj1.hl=he;
                adj_obj2.hf=startFace;
                adj_obj2.hl=he.sym;
                startFace.adjacent_faces.push(adj_obj1);
                he.sym.hfs[idx1].adjacent_faces.push(adj_obj2);
                new_hfs.push(he.sym.hfs[idx1].sym_face);
                new_sym_hfs.splice(0,0,he.sym.hfs[idx1]);
            }    
            startFace=he.sym.hfs[idx1].sym_face;
        }while(startFace!=he.hfs[0])
        he.hfs=new_hfs;
        he.sym.hfs=new_sym_hfs;
 
    }


    //find cells 
    var cell_id=0;
    for(var f in this.mesh_half_face)
    {
        if(this.mesh_half_face[f].cell!=undefined) continue;
        var cell=new Cell(cell_id);
        this.mesh_half_face[f].cell=cell;
        cell.hfs.push(this.mesh_half_face[f]);
        for(var v in this.mesh_half_face[f].vertices)
        	cell.vertices.push(this.mesh_half_face[f].vertices[v].id);
        this.mesh_cell.push(cell);
        ConstructSingleCell(this.mesh_half_face[f]);
        cell_id++;
    }
    var max_volume=0;
    for(var c in this.mesh_cell)
    {
    	//Compute cell center;
        this.mesh_cell[c].vertices.sort(function(a,b){return a-b;});

     	var temp=this.mesh_cell[c].vertices.slice(0);
    	this.mesh_cell[c].vertices=[];
		this.mesh_cell[c].vertices.push(this.mesh_vertex[temp[0]]);
		for(var v=1;v<temp.length;v++)
		{
			if(temp[v]==temp[v-1])
				continue;
			else
				this.mesh_cell[c].vertices.push(this.mesh_vertex[temp[v]]);
		}
		var center_v=new THREE.Vector3();
		for(var v in this.mesh_cell[c].vertices)
			center_v.add(this.mesh_cell[c].vertices[v].pos);
		center_v.divideScalar(this.mesh_cell[c].vertices.length);
		this.mesh_cell[c].center_pos=center_v;
        
        //Computer cell volume and find the external cell;
        var face_v=[];
        var area=[]
        for(var f in this.mesh_cell[c].hfs)
        {
            var v0=this.mesh_cell[c].hfs[f].vertices[0].pos;
            var v1=this.mesh_cell[c].hfs[f].vertices[1].pos;
            face_v.push([v0,v1,this.mesh_cell[c].hfs[f].center_pos]);
            area.push(this.mesh_cell[c].hfs[f].area);
        }
        this.mesh_cell[c].volume=ComputePolyhedronVolume(face_v,area,center_v);
        if(this.mesh_cell[c].volume>max_volume)
        {
            max_volume=this.mesh_cell[c].volume;
            this.external_cell_ID=this.mesh_cell[c].id;
        }
    }

    if(this.external_cell_ID==undefined)
    {
        alert("No external cell!")
        return;
    }
    else 
    {
        for(var f in this.mesh_cell[this.external_cell_ID].hfs)
            this.mesh_cell[this.external_cell_ID].hfs[f].external_surface=true;
    }
    this.half_face_finished=true;
	
}
Mesh.prototype.findAxis=function(){
    'use strict'
    if(!this.half_face_finished) return;
    //find external axises
    var hl_flag=[];
    for(var i=0;i<this.mesh_half_edge.length;i+=2)
    {
        if(this.mesh_half_edge[i].hfs.length==0)
            hl_flag[i/2]=false;
        else
        {
            for(var f in this.mesh_half_edge[i].hfs)
            {
                if(this.mesh_half_edge[i].hfs[f].external_surface || this.mesh_half_edge[i].hfs[f].sym_face.external_surface)
                {
                    hl_flag[i/2]=false;
                    break;
                }    
                else
                    hl_flag[i/2]=true;  
            }    
        }
    }
    for(var i in hl_flag)
    {
        if(hl_flag[i])
        {
            var axis=new internal_axis();
            axis.hl=this.mesh_half_edge[2*i];
            this.in_axis.push(axis);
        }
        else
        {
            var axis=new external_axis();
            axis.hl=this.mesh_half_edge[2*i];
            this.ex_axis.push(axis);
        }
    }

    //Sort the cell around the edge;
    var map_index=0;
    for(var i in this.in_axis)
    {
        var sign=1;
        // var reverse_flag=false;
        // if(this.in_axis[i].hl.hfs[0].sym_face.cell.id==this.this.in_axis[i].hl.hfs[1].cell.id) reverse_flag=false;
        // else reverse_flag=true;

        for(var f in this.in_axis[i].hl.hfs)
        {
            this.in_axis[i].Sort_Cell_ID.push(this.in_axis[i].hl.hfs[f].sym_face.cell.id);
            var cell_pair_obj=new Cell_Pair();
            var dir=GetPlaneDirectedNormal_3P(this.in_axis[i].hl.hfs[f].cell.center_pos,
                this.in_axis[i].hl.hfs[f].center_pos,
                this.in_axis[i].hl.sym.vert.pos,
                this.in_axis[i].hl.vert.pos);
            var thick=this.in_axis[i].hl.hfs[f].area;
            cell_pair_obj.c_p=new THREE.Vector2(this.in_axis[i].hl.hfs[f].sym_face.cell.id,this.in_axis[i].hl.hfs[f].cell.id);

            var index=this.internal_dual_edge_map.findIndex(function(x){
                return (x.c_p.x==cell_pair_obj.c_p.x && x.c_p.y==cell_pair_obj.c_p.y)||
                (x.c_p.x==cell_pair_obj.c_p.y && x.c_p.y==cell_pair_obj.c_p.x);
            })
            var pair=new THREE.Vector2();
            if(index==-1)
            {
                if(cell_pair_obj.c_p.y>cell_pair_obj.c_p.x)
                {
                    sign=1;
                    pair.x=cell_pair_obj.c_p.x;
                    pair.y=cell_pair_obj.c_p.y;
                }
                else
                {
                    sign=-1;
                    pair.x=cell_pair_obj.c_p.y;
                    pair.y=cell_pair_obj.c_p.x;
                }
                var in_edge_obj=new Direction_Map_Obj();
                var d=new THREE.Vector3(sign*dir.x,sign*dir.y,sign*dir.z);
                in_edge_obj.c_p=pair;
                in_edge_obj.direction_vector=d;
                in_edge_obj.id=map_index;
                in_edge_obj.thick_value=thick;
                this.internal_dual_edge_map.push(in_edge_obj);
                cell_pair_obj.dual_edge_ID=map_index;
                map_index++;
            }
            else 
                cell_pair_obj.dual_edge_ID=index;
            this.in_axis[i].cell_pair.push(cell_pair_obj);
        }
    }
}
Mesh.prototype.Produce_dual_structure=function(){
    'use strict'
    //Using numeric.solveLP(m_C,                   /* minimize m_C*x                */
                    //m_A,                  /* matrix m_A of inequality constraint */
                    //m_b,                  /* RHS m_b of inequality constraint    */
                    //m_Aeq,                /* matrix m_Aeq of equality constraint */
                    //m_beq).               /* vector m_beq of equality constraint */
    if(!this.half_face_finished) return;
    var axis_num_3=this.in_axis.length*3;
    var internal_edge_num= this.internal_dual_edge_map.length;
    if(axis_num_3==0 ||internal_edge_num==0) return;
    var m_Aeq=[];
    var m_A=[],m_b=[],m_beq=[],m_C=[];;
    var rank=0;
    var s;
    var tol;
    for(var i=0;i<axis_num_3;i+=3)
    {
        m_Aeq[i]=new Array(internal_edge_num);
        m_Aeq[i].fill(0);
        m_Aeq[i+1]=new Array(internal_edge_num);
        m_Aeq[i+1].fill(0);
        m_Aeq[i+2]=new Array(internal_edge_num);
        m_Aeq[i+2].fill(0);
        for(var j=0;j<this.in_axis[i/3].cell_pair.length;j++)
        {
            var sign=0;
            var id=this.in_axis[i/3].cell_pair[j].dual_edge_ID;
            if(this.in_axis[i/3].cell_pair[j].c_p.x==this.internal_dual_edge_map[id].c_p.x &&
                this.in_axis[i/3].cell_pair[j].c_p.y==this.internal_dual_edge_map[id].c_p.y)
                sign=1;
            else sign=-1;
            m_Aeq[i][id]=sign*this.internal_dual_edge_map[id].direction_vector.x;
            m_Aeq[i+1][id]=sign*this.internal_dual_edge_map[id].direction_vector.y;
            m_Aeq[i+2][id]=sign*this.internal_dual_edge_map[id].direction_vector.z;
        }
    }
    // for(var i=0;i<2*this.in_axis.length;i+=2)
    // {
    //     m_Aeq[i]=new Array(internal_edge_num);
    //     m_Aeq[i].fill(0);
    //     m_Aeq[i+1]=new Array(internal_edge_num);
    //     m_Aeq[i+1].fill(0);
    //     //m_Aeq[i+2]=new Array(internal_edge_num);
    //     //m_Aeq[i+2].fill(0);
    //     for(var j=0;j<this.in_axis[i/2].cell_pair.length;j++)
    //     {
    //         var sign=0;
    //         var id=this.in_axis[i/2].cell_pair[j].dual_edge_ID;
    //         if(this.in_axis[i/2].cell_pair[j].c_p.x==this.internal_dual_edge_map[id].c_p.x &&
    //             this.in_axis[i/2].cell_pair[j].c_p.y==this.internal_dual_edge_map[id].c_p.y)
    //             sign=1;
    //         else sign=-1;
    //         m_Aeq[i][id]=sign*this.internal_dual_edge_map[id].direction_vector.x.toFixed(3);
    //         m_Aeq[i+1][id]=sign*this.internal_dual_edge_map[id].direction_vector.y.toFixed(3);
    //         //m_Aeq[i+2][id]=sign*this.internal_dual_edge_map[id].direction_vector.z.toFixed(3);
    //     }
    // }
    ///////////////////////////////////////////////////////////////
    if(m_Aeq.length<m_Aeq[0].length){
        var m_Aeq_copy=m_Aeq.slice();
        while(m_Aeq_copy.length<m_Aeq_copy[0].length){
            var arr=new Array(m_Aeq[0].length);
            arr.fill(0);
            m_Aeq_copy.push(arr);
        }
        s=numeric.svd(m_Aeq_copy).S;
     }
     else
        s=numeric.svd(m_Aeq).S;
     var maxS=0;
     for(var i=0;i<s.length;i++){
         if(Math.abs(s[i])>maxS)
            maxS=Math.abs(s[i]);
     }
     tol=maxS*0.001;
     for(var i=0;i<s.length;i++){
         if(Math.abs(s[i])>tol)
             rank++;
     }
     if(rank<m_Aeq.length){       
         m_Aeq=Maxium_Linear_Independent_Group(numeric.transpose(m_Aeq),tol).result;
         m_Aeq=numeric.transpose(m_Aeq);
     }
    console.log(m_Aeq);
    for(var i=0;i<internal_edge_num;i++)
    {
        m_A[i]=new Array(internal_edge_num);
        m_A[i].fill(0);
        m_A[i][i]=-1;
    }
    for(var i=0;i<internal_edge_num;i++)
        m_b[i]=-1;
    for(var i=0;i<m_Aeq.length;i++)
        m_beq[i]=0;
    for(var i=0;i<internal_edge_num;i++)
        m_C[i]=1;
    var x=numeric.solveLP(m_C,m_A,m_b,m_Aeq,m_beq); 
    console.log(x);
    for(var i=0;i<internal_edge_num;i++)
        this.internal_dual_edge_map[i].length=x.solution[i];

    var startId=0;
    if(this.external_cell_ID==0) startId=1;
    this.mesh_cell[startId].dual_pos=new THREE.Vector3();
    this.computeDualPos(startId);
    this.dual_geo_center.divideScalar(this.mesh_cell.length-1);
    this.computeExDualEdge();

    var l1=(new THREE.Vector3().subVectors(this.bound[1],this.bound[0]));
    var l2=(new THREE.Vector3().subVectors(this.dual_bound[1],this.dual_bound[0]));

     var scale=l1.length()/l2.length()*0.75;

     for(var i in this.mesh_cell)
     {  
        if(i==this.external_cell_ID) continue;
        this.mesh_cell[i].dual_pos.sub(this.dual_geo_center)
        this.mesh_cell[i].dual_pos.multiplyScalar(scale);
        this.mesh_cell[i].dual_pos.add(this.mesh_cell[this.external_cell_ID].center_pos);
        for(var j in this.mesh_cell[i].external_dual_edge)
            this.mesh_cell[i].external_dual_edge[j].multiplyScalar(l1.length()*0.08);
     }


     
     for(var i in this.dual_bound)
     {
        this.dual_bound[i].sub(this.dual_geo_center);
        this.dual_bound[i].multiplyScalar(scale);
        this.dual_bound[i].add(this.mesh_cell[this.external_cell_ID].center_pos);
     }
     this.dual_geo_center=new THREE.Vector3().copy(this.mesh_cell[this.external_cell_ID].center_pos);
     for(var i in this.internal_dual_edge_map)
        this.internal_dual_edge_map[i].length*=scale;

     this.dual_finished=true;
    

}
Mesh.prototype.computeDualPos=function(startCell_id){

    'use strict'
    if(this.internal_dual_edge_map.length==0) return;
    var startPos=this.mesh_cell[startCell_id].dual_pos;
    if(startPos==undefined) return;
    var startCell=this.mesh_cell[startCell_id];
    for(var f in this.mesh_cell[startCell_id].hfs)
    {
        if(startCell.hfs[f].sym_face.cell.dual_pos!=undefined || startCell.hfs[f].sym_face.cell.id==this.external_cell_ID)
            continue;
        var neighbourID=startCell.hfs[f].sym_face.cell.id;
        var c_pair=new THREE.Vector2(startCell_id,neighbourID);
        var dual_p=undefined;
        var sign=1;
        if(startCell_id<neighbourID)
            sign=1;
        else
            sign=-1;
        var index=this.internal_dual_edge_map.findIndex(function(x) { 
            return (x.c_p.x== c_pair.x && x.c_p.y == c_pair.y)
                    || (x.c_p.x==c_pair.y && x.c_p.y==c_pair.x); 
        });

        if(index==-1)
        {
            var dir = GetPlaneDirectedNormal_3P(startCell.hfs[f].sym_face.cell.center_pos,
                startCell.hfs[f].vertices[0].pos,
                startCell.hfs[f].vertices[1].pos,
                startCell.hfs[f].center_pos);
            var in_edge_obj=new Direction_Map_Obj();

            var pair=new THREE.Vector2();
            if(startCell.id>startCell.hfs[f].sym_face.cell.id){
                pair.x=startCell.hfs[f].sym_face.cell.id;
                pair.y=startCell.id;
            }
            else{
                pair.x=startCell.id;
                pair.y=startCell.hfs[f].sym_face.cell.id;
            }
            in_edge_obj.c_p=pair;
            in_edge_obj.direction_vector=dir;
            in_edge_obj.id=this.internal_dual_edge_map.length;
            in_edge_obj.thick_value=startCell.hfs[f].area;
            in_edge_obj.length=1;
            this.internal_dual_edge_map.push(in_edge_obj);

            dual_p=new THREE.Vector3().addVectors(startPos,dir);
        }
        else{
            in_edge_obj=this.internal_dual_edge_map[index];
            
            dual_p=new THREE.Vector3().addVectors(startPos,
                new THREE.Vector3().addScaledVector(in_edge_obj.direction_vector,sign*in_edge_obj.length));
        }

        this.mesh_cell[neighbourID].dual_pos=dual_p;
        if(dual_p.x<this.dual_bound[0].x)
            this.dual_bound[0].x=dual_p.x;
        else if(dual_p.x>this.dual_bound[1].x)
            this.dual_bound[1].x=dual_p.x;

        if(dual_p.y<this.dual_bound[0].y)
            this.dual_bound[0].y=dual_p.y;
        else if(dual_p.y>this.dual_bound[1].y)
            this.dual_bound[1].y=dual_p.y;

        if(dual_p.z<this.dual_bound[0].z)
            this.dual_bound[0].z=dual_p.z
        else if(dual_p.z>this.dual_bound[1].z)
            this.dual_bound[1].z=dual_p.z;

        this.dual_geo_center.add(this.mesh_cell[neighbourID].dual_pos);
        this.computeDualPos(neighbourID);
    }
}
Mesh.prototype.computeExDualEdge=function(){
    'use strict'
    if(this.external_cell_ID==undefined) return;
    var ex_cell=this.mesh_cell[this.external_cell_ID];
    for(var f in ex_cell.hfs){
        var nor=GetPlaneDirectedNormal_3P(ex_cell.hfs[f].sym_face.cell.center_pos,
            ex_cell.hfs[f].vertices[0].pos,
            ex_cell.hfs[f].vertices[1].pos,
            ex_cell.hfs[f].center_pos);
        nor.multiplyScalar(-1);
        ex_cell.hfs[f].sym_face.cell.external_dual_edge.push(nor);
    }
}
Mesh.prototype.clear=function(){
    'use strict'
    this.mesh_vertex=[];
    this.mesh_half_edge=[];
    this.mesh_half_face=[];
    this.mesh_cell=[];
    this.half_face_finished=false;
    this.external_cell_ID=undefined;
    this.dual_finished=false;
    this.dual_geo_center=new THREE.Vector3();


    this.bound=[new THREE.Vector3(),new THREE.Vector3()];
    this.dual_bound=[new THREE.Vector3,new THREE.Vector3()];

    this.in_axis=[];
    this.ex_axis=[];

    this.internal_dual_edge_map=[];
}