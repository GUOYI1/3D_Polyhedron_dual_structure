import json
import string
import sys
import os
class Txt2Json:
	def __init__(self):
		self.json={
			'vertices':{},
			'edges':{},
			'face_vertices':{},
			'face_edges':{},
		}
	def ParseVertices(self,filename):
		vertex= open(filename);
		v=self.json['vertices'];
		i=0;
		for line in vertex:		
			v_pos=line.strip().split('\t');
			i=int(v_pos[0]);
			v[i]=map(float,v_pos[1:]);

	def ParseEdges(self,filename):
		edge=open(filename);
		e=self.json['edges'];
		i=0;
		for line in edge:
			edge_v=line.strip().split('\t');
			index=string.replace(edge_v[0],"e_","");		
			i=int(index);
		 	e[i]=map(int,edge_v[1:]);

	def ParseFace_Vert(self,filename):
		f_vertex=open(filename);
		f_v=self.json['face_vertices'];
		i=0;
		for line in f_vertex:
			v_group=line.strip().split('\t');
			index=string.replace(v_group[0],"f","");
			i=int(index);
			f_v[i]=map(int,v_group[1:]);

	def ParseFace_Edge(self,filename):
		f_edge=open(filename);
		f_e=self.json['face_edges'];
		i=0;
		for line in f_edge:
			edge_group=line.strip().split('\t');
			index=string.replace(edge_group[0],"f","");
			i=int(index);
			data=[];
			data.append("");
			for n in range(1,len(edge_group)):
				num=string.replace(edge_group[n],"e_","");
				data.append(num);
			f_e[i]=map(int,data[1:]);



def store(jsondata,filename):
    with open(filename, 'w') as f:
        f.write(json.dumps(jsondata,sort_keys=True,indent=4));
 
if __name__ == "__main__":
	if len(sys.argv)>1:
		foldername=sys.argv[1];
		# foldername = "test";
		Parse=Txt2Json();
		if os.path.exists(foldername+"/force_v.txt")==False or os.path.exists(foldername+"/force_e_v.txt")==False\
		or os.path.exists(foldername+"/force_f_e.txt")==False or os.path.exists(foldername+"/force_f_v.txt")==False:
			print "The files doesn't exist.";
		Parse.ParseVertices(foldername+"/force_v.txt");
		Parse.ParseEdges(foldername+"/force_e_v.txt");
		Parse.ParseFace_Vert(foldername+"/force_f_v.txt");
		Parse.ParseFace_Edge(foldername+"/force_f_e.txt");
		store(Parse.json,foldername+'.json');