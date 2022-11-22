import {Raycaster, Vector3, LineBasicMaterial, Line, BufferGeometry, BufferAttribute} from "three";
import { sceneService } from "../services";

let origin = new Vector3();
let direction = new Vector3();
const intersections = [];

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;

export const CullHiddenFaces = async(meshes) => {
    console.log(meshes)

    // make a 2 dimensional array that will hold the layers
    const culls = [];

    // make sure to place them in the correct array group based on their culling layer
    meshes.forEach(mesh => {
        if (mesh.userData.cullLayer != null){
            if (mesh.userData.origIndexBuffer == null)
                mesh.userData.origIndexBuffer = new BufferAttribute(mesh.geometry.index.array,1,false);
        
            if (culls [mesh.userData.cullLayer] == null)
                culls [mesh.userData.cullLayer] = [];

            culls [mesh.userData.cullLayer].push(mesh);
        }
    });

    // this array will hold all possible mesh colliders
    let hitArr = [];

    // go from top to bottom to increase array size of collide meshes
    // lowest layer should consider all meshes
    // top layer will always be visible (if theres only 1 lkayer (base layer), then it will be visible)
    for (var i = culls.length - 1; i >= 0; i--) {
        if (hitArr.length != 0 || culls.length == 1){
            console.log(hitArr)
            for (let k = 0; k < culls[i].length; k++){

                const mesh = culls[i][k];

                const index = mesh.userData.origIndexBuffer.array;
                const vertexData = mesh.geometry.attributes.position.array;
                const normalsData = mesh.geometry.attributes.normal.array;
                const faceNormals = mesh.geometry.userData.faceNormals;
                
                mesh.geometry.setIndex(getIndexBuffer(index,vertexData,normalsData, faceNormals, hitArr));
            }
        }
        hitArr = [...hitArr, ...culls[i]]
    }
}

const getIndexBuffer = (index, vertexData, normalsData, faceNormals, intersectModels) =>{
    const indexCustomArr = [];
    console.log(intersectModels)
    // we should make this data editable by user
    raycaster.far = 0.035;
let counter = 30;
    for (let i =0; i < index.length/3 ;i++){

        //set the direction of the raycast with the normals of the faces
        direction = faceNormals[i].normalize();
        //if (faceNormals)
            //direction.set(faceNormals[i].x,faceNormals[i].y,faceNormals[i].z).normalize();

        const idxBase = i * 3;
        //if at least 1 vertex collides with nothing, it is visible
        for (let j = 0; j < 3 ; j++){
            // reset intersections
            intersections.length = 0;

            // mutliplied by 3 as it refers to a vector3 saved as a float array
            const vi = index[idxBase+j] * 3;

            // if face normals was not defined, use vertex normals instead
            if (faceNormals == null)
                direction.set(normalsData[vi],normalsData[vi+1],normalsData[vi+2]).normalize();
            //else
                //direction = faceNormals[i].normalize();

            // move the origin away to have the raycast being casted from outside
            origin.set(vertexData[vi],vertexData[vi+1],vertexData[vi+2]).add(direction.clone().multiplyScalar(0.03))
            
            //invert the direction of the raycaster as we moved it away from its origin
            raycaster.set( origin, direction.multiplyScalar(-1));

            //DebugRay(origin, direction,raycaster.far, 0x00ff00,sceneService.getScene() );

            // if it hits it means vertex is visible
            if (raycaster.intersectObjects( intersectModels, false, intersections ).length === 0){
                
                if (counter >= 0){
                    counter--;
                    DebugRay(origin, direction,raycaster.far, 0xffff00,sceneService.getScene() );
                }
                //DebugRay(origin, direction,raycaster.far, 0xffff00,sceneService.getScene() );
                for (let k = 0; k < 3 ; k++){
                    //const vi = index[k+i] * 3;
                    indexCustomArr.push(index[idxBase+k])
                }
                break;
            }
            else{
                //this did collide
                //DebugRay(origin, direction,raycaster.far, 0xff0000,sceneService.getScene() );
            }
        }
    }

    const indexArr = new Uint32Array(indexCustomArr);
    return new BufferAttribute(indexArr,1,false);
}

export const DisplayMeshIfVisible = async(mesh, traitModel, greed = 10) => {

    if (mesh.userData.origIndexBuffer == null)
        mesh.userData.origIndexBuffer = new BufferAttribute(mesh.geometry.index.array,1,false);

    //let greedCounter =  0;
    const traitMeshes = [];
    
    traitModel?.traverse((child)=>{
        if (child.isMesh){
            // create the bound tree whne loading model instead
            //if (child.geometry.boundsTree == null)
                // child.geometry.computeBoundsTree({strategy:SAH});
            
            traitMeshes.push(child);
        }
    });
    
    // create the bound tree whne loading model instead
    //if (mesh.geometry.boundsTree == null)
        // mesh.geometry.computeBoundsTree({strategy:SAH});

    const raycaster = new Raycaster();
    raycaster.firstHitOnly = true;
    
    raycaster.far = 0.035;

    //const index = mesh.geometry.index.array;
    const index = mesh.userData.origIndexBuffer.array;
    const vertexData = mesh.geometry.attributes.position.array;
    const normalsData = mesh.geometry.attributes.normal.array;

    //let hidden = true;
    let origin = new Vector3();
    let direction = new Vector3();
    
    const intersections = [];
    //console.log(index.length);
    
    const indexCustomArr = [];
    for (let i =0; i < index.length;i+=3){
        
        //const vi = index[i] * 3;
        //indexCustomArr.push(index[i])

        //if at least 1 vertex collides with nothing, it is vi9sible
        for (let j = 0; j < 3 ; j++){

            intersections.length = 0;
            // mutliplied by 3 as it refers to a vector3 saved as a float array
            const vi = index[i+j] * 3;

            direction.set(normalsData[vi],normalsData[vi+1],normalsData[vi+2]).normalize();
            origin.set(vertexData[vi],vertexData[vi+1],vertexData[vi+2]).add(direction.clone().multiplyScalar(0.03))
            
            raycaster.set(origin,direction.multiplyScalar(-1));

            //DebugRay(origin, direction,raycaster.far, 0x00ff00,mesh );
            if (raycaster.intersectObjects( traitMeshes, false, intersections ).length === 0){
                
                //DebugRay(origin, direction,raycaster.far, 0xff0000,mesh );
                for (let k = 0; k < 3 ; k++){
                    //const vi = index[k+i] * 3;
                    indexCustomArr.push(index[i+k])
                }
                break;
                // greedCounter++;
                // if (greedCounter >= greed){
                //     hidden = false;
                //     //save the 3 indices and break out of the triangle, as this triangle is visible
                //     break;
                // }
            }
        }
    }

    //console.log(indexCustomArr);
    const indexArr = new Uint32Array(indexCustomArr);
    const buffer = new BufferAttribute(indexArr,1,false);

    mesh.geometry.setIndex(buffer);

    //mesh.visible = !hidden;
}



function DebugRay(origin, direction, length, color, scene){
    //console.log("tt")
    if (scene.lines == null)
        scene.lines = [];
    else{
        // scene.lines.forEach(line => {
        //     line.visible = false;
        // });
        // scene.lines.length = 0;
    }

    let endPoint = new Vector3();
    endPoint.addVectors ( origin, direction.multiplyScalar( length ) );

    const points = []
    points.push( origin );
    points.push( endPoint );
    const geometry = new BufferGeometry().setFromPoints( points );
    let material = new LineBasicMaterial( { color : color } );
    var line = new Line( geometry, material );
    //line.renderOrder = 100;
    scene.parent.add( line );
    scene.lines.push(line);
}