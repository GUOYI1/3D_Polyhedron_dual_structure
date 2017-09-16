//This file includes some useful mathematical solutions that can be used in WebGL.Three.js and numeric.js need to be included

function swap(a,b)
{
	var temp=a;
	a=b;
	b=temp;
}
//Compute the intersection of 2 lines
function Line_intersection_2D(A1,B1,C1,A2,B2,C2)
{
	//A1X+B1Y+C1=A2X+B2Y+C2
	'use strict'
	var x=numeric.solve([[A1,B1],[A2,B2]],[-C1,-C2]);
	return x;
}

//Get the edge normal that points to a certain point 
function Get_Perpendicular_Vector(v_a, v_b, tar) 
{
    'use strict'
    var e_vector = new THREE.Vector3();
    e_vector.subVectors(v_b, v_a);
    var v = tar.sub(v_a);
    return (v.sub(e_vector.multiplyScalar(v.dot(e_vector) / e_vector.lengthSq()))).normalize();
}
function ComputePolygonArea(vertices,pos)
{
	'use strict'
	if(pos==undefined)
	{
		pos=new THREE.Vector3();
		for(var v in vertices)
			pos.add(vertices[v]);
		pos.divideScalar(vertices.length);
	}
	var idx1=0,idx2=1;
	var area=0
	while(idx1<vertices.length)
	{
		var v1=new THREE.Vector3().subVectors(vertices[idx1],pos);
		var v2=new THREE.Vector3().subVectors(vertices[idx2],pos);
		area+=(0.5*new THREE.Vector3().crossVectors(v1,v2).length());

		idx1++;
		if(idx1==vertices.length-1)
			idx2=0;
		else
			idx2=idx1+1;
	}
	return area;

}
function GetPlaneNormal_3P(p1,p2,p3)
{
	'use strict'
	var l1=new THREE.Vector3().subVectors(p2,p1);
	var l2=new THREE.Vector3().subVectors(p3,p1);
	var nor=new THREE.Vector3().crossVectors(l1,l2);
	if(nor.length()==0) return nor;
	return nor.normalize();
}
function GetPlaneDirectedNormal_3P(target,p1,p2,p3)
{
	var nor=GetPlaneNormal_3P(p1,p2,p3);
	var vec=new THREE.Vector3().subVectors(target,p1);
	if(vec.dot(nor)<0) nor.multiplyScalar(-1);
	return nor;
}
function GetPlaneNormal_2l(l1,l2)
{
	'use strict'
	var nor=new THREE.Vector3().crossVectors(l1,l2).normalize();
	if(nor.length()==0) return nor;
	return nor.normalize();
}
function Point2PlaneDis_3P(point, planeVetices1,planeVetices2,planeVetices3)
{
	'use strict'
	var nor=GetPlaneNormal_3P(planeVetices1,planeVetices2,planeVetices3);

	var vec=new THREE.Vector3().subVectors(point,planeVetices1);
	return Math.abs(vec.dot(nor));
}
function Point2PlaneDis_PN(point, planeVetices1,planeNormal)
{
	'use strict'
	var vec=new THREE.Vector3().subVectors(point,planeVetices1);
	return Math.abs(vec.dot(planeNormal));
}
function ComputePolyhedronVolume(Face_v,Area,point)
{
	//Face_v store the positions of 3 points representing a plane. Area represents the area of the faces.
	'use strict'
	var volume=0;
	for(var f in Face_v)
	{
		var height=Point2PlaneDis_3P(point,Face_v[f][0],Face_v[f][1],Face_v[f][2]);
		volume+=(Area[f]*height/3);
	}
	return volume;
}


//Extension for numeric.js
function Maxium_Linear_Independent_Group(m,tol){
    'use strict'
    var matrix=new Array(m.length);
    for(var i=0;i<m.length;i++)
        matrix[i]=m[i].slice(0);
    var matrix_T=numeric.transpose(matrix);
    var lead = 0;
    var rows=matrix.length;
    var cols=matrix[0].length;
    var result=[];
    for (var r = 0; r < rows; r++) {
        if (cols <= lead) {
            break;
        }
        var i = r;
        while (Math.abs(matrix[i][lead])<tol) {
            i++;
            if (rows == i) {
                i = r;
                lead++;
                if (cols == lead) {
                    break;
                }
            }
        }
        if (cols == lead) break;

        var tmp = matrix[i];
        matrix[i] = matrix[r];
        matrix[r] = tmp;
 
        var val = matrix[r][lead];
        for (var j = 0; j < cols; j++) {
            matrix[r][j] /= val;
        }
        for (var i = r+1; i < rows; i++) {
            val = matrix[i][lead];
            for (var j = 0; j < cols; j++) {
                matrix[i][j] -= val * matrix[r][j];
                // console.log(matrix[i][j]);
            }
        }
        lead++;
    }
    var idx_Independent=[];
    var idx_Depend=[];
    var start=0;
    for(var i=0;i<matrix.length;i++){
        var flag=false;
        for(var j=start;j<matrix[i].length;j++){
            if(matrix[i][j]>tol){
                flag=true;
                idx_Independent.push(j);
                result.push(matrix_T[j]);
                start=j+1;
                break;
            }
            else idx_Depend.push(j);
        } 
        if(!flag) break; 
    } 
    return {
        result:numeric.transpose(result),
        idx_Independent:idx_Independent,
        idx_Depend:idx_Depend
    }; 
}

function pinv(A) {
  var z = numeric.svd(A), foo = z.S[0];
  var U = z.U, S = z.S, V = z.V;
  var m = A.length, n = A[0].length, tol = Math.max(m,n)*numeric.epsilon*foo,M = S.length;
  var i,Sinv = new Array(M);
  for(i=M-1;i!==-1;i--) { if(S[i]>tol) Sinv[i] = 1/S[i]; else Sinv[i] = 0; }
  return numeric.dot(numeric.dot(V,numeric.diag(Sinv)),numeric.transpose(U))
}
