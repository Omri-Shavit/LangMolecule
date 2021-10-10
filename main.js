//window.onload = function(){
// ----- instantiate variables -----
let inputCanvas = document.getElementById("graphInput");
let inputCtx = inputCanvas.getContext("2d");
let nodeRadius = 5;
let nodes = [];
let leafNodes = [];
let sideNodes = {};
let nodeUUID = 0;
let edges = [];
let dragOffsets = [0, 0];
let inputAuxDragging = false;
let selectedNode = null;
let mousedown = false;
let radioVal = "nodes";
let showLabels = true; // false
let polygonCanvas = document.getElementById('polygonDisplay');
let polyCtx = polygonCanvas.getContext("2d");
let pollyBtn = document.getElementById('createPoly');
let polyIsShowing = false;
let sideLengths = [];
let vertices = [];
let runLangBtn = document.getElementById('runLang');
let selectedVertex = null;
let graphDistance = {};
let inputZoom = {scale:583, focus:{x:0,y:0}};
let polyZoom = {scale:583, focus:{x:0,y:0}};

// ------ state getters & setters ------
function getState(){ // TODO: incorporate polygonCanvas state
    let stateNodes = nodes.map((n)=>{return {UUID:n.UUID, x:n.x, y:n.y}});
    let stateEdges = edges.map((e)=>[e[0].UUID, e[1].UUID]);
    return {nodes:stateNodes, edges:stateEdges};
}

function setState(state){
    clearAll();
    let maxUUID = -1;
    for(let node of state.nodes){
        nodes.push({ // add node to graph
            UUID: node.UUID,
            x: node.x,
            y: node.y,
            children: [],
            selected: false
        });
        if(node.UUID > maxUUID) maxUUID = node.UUID;
    }
    nodeUUID = maxUUID + 1;
    for(let edge of state.edges){
        let node1; let node2;
        for(let node of nodes){
            if(node.UUID === edge[0]) node1 = node;
            if(node.UUID === edge[1]) node2 = node;
        }
        if (node1 && node2){ // add edge to graph
            edges.push([node1,node2]);
            node1.children.push(node2);
            node2.children.push(node1);
        }
    }
    renderInputGraph();
}

function inputPxToVirtual(x, y=null){
    if (y===null){
        y = x.y;
        x = x.x;
    }
    return {x:(x-inputZoom.focus.x)/inputZoom.scale, y:(y-inputZoom.focus.y)/inputZoom.scale}
}

function inputVirtualToPx(x, y=null){
    if (y===null){
        y = x.y;
        x = x.x;
    }
    return {x:x*inputZoom.scale+inputZoom.focus.x, y:y*inputZoom.scale+inputZoom.focus.y}
}

function polyPxToVirtual(x, y=null){
    if (y===null){
        y = x.y;
        x = x.x;
    }
    return {x:(x-polyZoom.focus.x)/polyZoom.scale, y:(y-polyZoom.focus.y)/polyZoom.scale}
}

function polyVirtualToPx(x, y=null){
    if (y===null){
        y = x.y;
        x = x.x;
    }
    return {x:x*polyZoom.scale+polyZoom.focus.x, y:y*polyZoom.scale+polyZoom.focus.y}
}

// ------ handle window resizes ------
function resize(){
    let colStyle = window.getComputedStyle(inputCanvas.parentNode); // get computed style of the input column
    inputCanvas.width = Math.floor( // TODO make this less ugly
        parseFloat(colStyle.width)-
        parseFloat(colStyle.paddingLeft)-
        parseFloat(colStyle.paddingRight)
    );
    inputCanvas.height = Math.floor(0.5*window.innerHeight); // canvas height to window height
    renderInputGraph();
    polygonCanvas.height = inputCanvas.height;
    polygonCanvas.width = inputCanvas.width;
    renderPolygonCanvas();
}
resize();

// TODO: TEMPORARY
setState({"nodes":[{"UUID":0,"x":0.4,"y":0.35},{"UUID":1,"x":0.5,"y":0.35},{"UUID":2,"x":0.4,"y":0.3},{"UUID":3,"x":0.5,"y":0.225},{"UUID":4,"x":0.4,"y":0.5},{"UUID":5,"x":0.5,"y":0.45},{"UUID":6,"x":0.7221269296740995,"y":0.3344768439108062}],"edges":[[0,1],[0,2],[0,4],[1,5],[1,3],[1,6]]});


window.addEventListener("resize", resize);

// ------ configure buttons ------
// radio inputs set radioVal
for(let radioBtn of document.getElementsByName("inputSetting")){
    radioBtn.addEventListener("click",(e)=>{radioVal = e.target.value; selectedNode=null;})
}
// toggle labels button
document.getElementById("toggleLabels").addEventListener("click",()=>{showLabels=!showLabels; renderInputGraph(); renderPolygonCanvas();});
// clear all button
function clearAll(){
    nodes = [];
    edges = [];
    nodeUUID = 0;
    inputZoom.focus.x = 0; inputZoom.focus.y = 0;
    inputZoom.scale = inputCanvas.width;
    renderInputGraph();
    renderPolygonCanvas();
    checkTreeValidity();
}
document.getElementById("clear").addEventListener("click",clearAll)

// ------ render input graph ------
function renderInputGraph(){
    // clear canvas
    inputCtx.fillStyle = "#D3D3D3";
    inputCtx.fillRect(0, 0, inputCanvas.width, inputCanvas.height);
    let p;
    // draw edges
    for (let edge of edges){
        inputCtx.strokeStyle = '#00A2E8';
        inputCtx.lineWidth = 2.5;
        inputCtx.beginPath();
        p = inputVirtualToPx(edge[0]);
        inputCtx.moveTo(p.x,p.y);
        p = inputVirtualToPx(edge[1]);
        inputCtx.lineTo(p.x,p.y);
        inputCtx.stroke();
        if (showLabels){ // label the edge with its length
            inputCtx.textAlign = 'center';
            inputCtx.lineWidth = 2;
            let text = Math.hypot(edge[0].x-edge[1].x, edge[0].y-edge[1].y).toFixed(3);
            p = inputVirtualToPx((edge[0].x+edge[1].x)/2,(edge[0].y+edge[1].y)/2);
            inputCtx.strokeStyle = '#FFFFFF';
            inputCtx.strokeText(text, p.x, p.y);
            inputCtx.fillStyle = '#000000';
            inputCtx.fillText(text, p.x, p.y);
        }
    }
    // draw nodes
    for (let node of nodes){
        // draw circle at node
        inputCtx.fillStyle = '#00A2E8';
        if (node.children.length === 1){
            inputCtx.fillStyle = 'rgb(34,177,76)';
        }
        inputCtx.beginPath();
        p = inputVirtualToPx(node);
        inputCtx.arc(p.x, p.y, nodeRadius, 0, 2 * Math.PI, false);
        inputCtx.fill();
        // draw transparent circle around node
        if (node.children.length === 1){
            inputCtx.fillStyle = 'rgba(34,177,76,0.25)';
            if(node.highlighted){
                inputCtx.fillStyle = 'rgb(34,177,76)';
            }
        } else {
            inputCtx.fillStyle = "rgba(0, 162, 232, 0.25)";
            if (node.highlighted){ // might change
                inputCtx.fillStyle = '#00A2E8';
            }
        }
        inputCtx.arc(p.x, p.y, 2*nodeRadius, 0, 2 * Math.PI, false);
        inputCtx.fill();
        if(showLabels){
            inputCtx.textAlign = 'center';
            inputCtx.lineWidth = 2;
            inputCtx.strokeStyle = '#FFFFFF';
            inputCtx.strokeText(uuidToString(node.UUID), p.x, p.y);
            inputCtx.fillStyle = '#000000';
            inputCtx.fillText(uuidToString(node.UUID), p.x, p.y);
        }
    }
}

function uuidToString(uuid){
    return `${uuid}`;
    //return String.fromCharCode((uuid % 26)+65) + (uuid/26 >= 1 ? (Math.floor(uuid/26) + 1): "");
}

// ------ tree algorithms ------
function DFS(root, target){ // returns shortest path from root to or null if none exists
    function DFSHelper(root, target, visited){
        if (root === target) return [target];
        for (let child of root.children){
            if (visited.includes(child)) continue;
            visited.push(child);
            let path = DFSHelper(child, target, visited);
            if (path){
                return [root].concat(path);
            }
        }
        return null;
    }
    return DFSHelper(root,target,[]);
}

function countTreeSize(node){
    if (!node) return 0;
    function countTreeSizeHelper(node,visited){
        let count = 1;
        for (let child of node.children) {
            if (visited.includes(child)) continue;
            visited.push(child);
            count += countTreeSizeHelper(child, visited);
        }
        return count;
    }
    return countTreeSizeHelper(node,[node]);
}
function CCDoublingCylce(node,callback = (p,n)=>{if(p){console.log(`${uuidToString(p.UUID)}->${uuidToString(n.UUID)}`)}}){
    function cycleHelper(node,callback,visited,previous){
        if(node.children.length === 1 && visited.has(node.children[0])){ // base case: leaf node
            return;
        }
        visited.add(node);
        node.children.sort((n1,n2)=>( // sort children by counter-clockwise-ness
            Math.atan2(n2.y-node.y,n2.x-node.x) - // CC angle of second node
            Math.atan2(n1.y-node.y,n1.x-node.x) // CC angle of first node
        ))
        if(previous){
            let pidx = node.children.indexOf(previous);
            node.children = node.children.slice(pidx+1,node.children.length)
                .concat(node.children.slice(0,pidx+1));
        }
        for(let child of node.children){
            if(visited.has(child)) continue;
            callback(node,child);
            cycleHelper(child,callback,visited,node);
            callback(child,node);
        }
    }
    return cycleHelper(node,callback,new Set());
}

function deleteNearby(x,y){
    // delete nearby edges
    for(let edge of edges){
        let xd = edge[0].x-edge[1].x;
        let yd = edge[0].y-edge[1].y;
        if (xd === 0 && yd === 0) continue; // avoid edges between duplicate nodes
        let d = xd*xd+yd*yd;
        let xi = x-edge[0].x;
        let yi = y-edge[0].y;
        if( // if point within bounding box of edge
            (Math.abs(2*(yd*yi+xd*xi)/d+1) < 1) && // point within box length
            (
                Math.pow((yd*yd*xi-xd*yd*yi)/d,2)+Math.pow((xd*xd*yi-xd*yd*xi)/d,2) <
                Math.pow(0.5*nodeRadius/inputCanvas.width,2) // hardcoded values are kinda gross, but alas
            ) // point within box width
        ){ // delete edge
            edge[0].children = edge[0].children.filter((e)=>e.UUID !== edge[1].UUID);
            edge[1].children = edge[1].children.filter((e)=>e.UUID !== edge[0].UUID);
            edges = edges.filter((e)=>e !== edge);
        }
    }
    // delete nearby nodes
    for(let node of nodes){
        if(Math.pow(x-node.x,2)+Math.pow(y-node.y,2)<Math.pow(nodeRadius/inputCanvas.width,2)){ // sufficiently close to node
            for(let child in node.children){ // first delete references to node in graph
                child.children = child.children.filter((e)=>e.UUID !== node.UUID);
                let n1 = node; let n2 = child;
                if (child.UUID < node.UUID){
                    n1 = child; n2 = node;
                }
                edges = edges.filter((edge)=>edge[0].UUID !== n1.UUID && edge[1].UUID !== n2.UUID) // remove edges
            }
            nodes = nodes.filter((n)=>n.UUID !== node.UUID); // remove node from nodes
        }
    }
    checkTreeValidity();
}

// ------ input canvas event listeners ------
function handleInputMousedown(e){
    let p = inputPxToVirtual(e.offsetX, e.offsetY); // get click coordinates
    let x = p.x; let y = p.y;
    mousedown = true;
    function selectNearestNode(){
        selectedNode = null; let minDistance = Infinity;
        for (let node of nodes){
            // good ol' euclidean distance
            let distance = Math.hypot(node.x-x, node.y-y);
            if (distance < minDistance && inputZoom.scale*distance < 2.5*nodeRadius){
                minDistance = distance;
                selectedNode = node;
                dragOffsets[0] = node.x-x;
                dragOffsets[1] = node.y-y;
            }
        }
    }
    switch (e.which){
        case 1: // left click
            // click action depends on radio input
            switch(radioVal) {
                case "nodes":
                    // create new node, append it to nodes[]
                    nodes.push({
                        UUID: nodeUUID,
                        x: x,
                        y: y,
                        children: [],
                        selected: false
                    })
                    nodeUUID += 1; // increment uuid
                    break;
                case "drag":
                    selectNearestNode();
                    if(selectedNode) selectedNode.highlighted = true;
                    break;
                case "edges":
                    if(selectedNode){ // if a node already selected ...
                        let first = selectedNode; // ... store first selected node ...
                        selectNearestNode(); // try to select second node ...
                        if (selectedNode){ // second select successful
                            // parent node is the one with a lesser UUID
                            let parent = first; let child = selectedNode;
                            if (parent.UUID > child.UUID){ // switch order
                                parent = selectedNode; child = first;
                            }
                            // check that adding the edge won't create a cycle (i.e. child not already a descendant of parent)
                            if(!DFS(parent,child)){
                                parent.children.push(child);
                                child.children.push(parent);
                                edges.push([parent,child]);
                            } else { // child already in subtree of parent
                                displayError("Input graph must be a tree (cycles disallowed)");
                            }
                        }
                        // deselect first node
                        selectedNode = null;
                        first.highlighted = false;
                    } else { // if node not already selected ...
                        selectNearestNode(); // select first node
                        if (selectedNode){
                            selectedNode.highlighted = true; // color it
                        }
                    }
                    break;
                case "delete":
                    deleteNearby(x,y);
                    break;
                default:
                    // do nothing
                    break;
            }
            break;
        case 2: // middle click
            inputCanvas.style.cursor = "grabbing";
            dragOffsets = [x,y];
            inputAuxDragging = true;
            break;
        case 3: // right click
            break;
        default: // other
            break;
    }
    checkTreeValidity();
    renderInputGraph(); // always render
}
function handleInputMousemove(e){
    let p = inputPxToVirtual(e.offsetX, e.offsetY); // get click coordinates
    let x = p.x; let y = p.y;
    if (!inputAuxDragging){
        switch (radioVal){
            case "drag":
                inputCanvas.style.cursor = "auto";
                for(let node of nodes) {
                    let d = Math.hypot(x-node.x,y-node.y);
                    if (d*inputZoom.scale < 2.5*nodeRadius){
                        inputCanvas.style.cursor = "all-scroll";
                    }
                }
                if(selectedNode){
                    selectedNode.x = x + dragOffsets[0]; selectedNode.y = y + dragOffsets[1];
                    if(polyIsShowing){
                        createPolygon();
                        renderPolygonCanvas();
                    }
                }
                break;
            case "delete":
                if (mousedown) deleteNearby(x,y);
                checkTreeValidity();
                break;
            default:
                break;
        }
    } else {
        inputZoom.focus.x += (p.x-dragOffsets[0])*inputZoom.scale;
        inputZoom.focus.y += (p.y-dragOffsets[1])*inputZoom.scale;
    }
    renderInputGraph();
}
function handleInputMouseup(e){
    let p = inputPxToVirtual(e.offsetX, e.offsetY); // get click coordinates
    let x = p.x; let y = p.y;
    switch(e.which){
        case 1:
            mousedown = false;
            switch (radioVal){
                case "drag":
                    if(selectedNode){
                        selectedNode.x = x + dragOffsets[0]; selectedNode.y = y + dragOffsets[1];
                        selectedNode.highlighted = false; // deselect selectedNode
                        selectedNode = null; // no more selectedNode
                    }
                    break;
                default:
                    break;
            }
            break;
        case 2:
            inputCanvas.style.cursor = "auto";
            inputAuxDragging = false;
            break;
        case 3:
            break;
        default:
            break;
    }
    renderInputGraph();
}
function handleInputWheel(e){
    let p = inputPxToVirtual(e.offsetX, e.offsetY); // get click coordinates
    let x = p.x; let y = p.y;
    let zoomFactor = 1.2;
    if(e.deltaY < 0){
        inputZoom.scale *= zoomFactor;
        inputCanvas.style.cursor = "zoom-in";
    } else if (e.deltaY > 0){
        inputZoom.scale /= zoomFactor;
        inputCanvas.style.cursor = "zoom-out";
    }
    setTimeout(()=>{inputCanvas.style.cursor = "auto"},1000);
    p = inputVirtualToPx(x,y);
    inputZoom.focus.x -= p.x-e.offsetX;
    inputZoom.focus.y -= p.y-e.offsetY;
    renderInputGraph();
}
inputCanvas.addEventListener("mousedown",handleInputMousedown);
inputCanvas.addEventListener("mousemove",handleInputMousemove);
inputCanvas.addEventListener("mouseup",handleInputMouseup);
inputCanvas.addEventListener("wheel",handleInputWheel);
// ------ generating polygon ------
// create polygon button
pollyBtn.addEventListener('click',createPolyBtn);

function checkTreeValidity(){
    pollyBtn.classList.remove('btn-success');
    pollyBtn.classList.add('btn-secondary');
    function removePolyDisplay(){
        polygonCanvas.style.display = 'none';
        runLangBtn.style.display = 'none';
        polyIsShowing = false;
    }
    let root = nodes[0];
    let subtreeCount = countTreeSize(root);
    if (!(subtreeCount === nodes.length)){
        removePolyDisplay();
        return {valid:false, reason:"Graph must be complete (not all nodes are connected to each other)"};
    }
    if (subtreeCount < 4){
        removePolyDisplay();
        return {valid: false, reason:`Minimum of 4 nodes required (there are ${nodes.length} nodes currently)`}
    }
    for(let node of nodes){
        if (node.children.length === 2){
            removePolyDisplay();
            return {valid: false, reason:`Nodes of degree 2 disallowed (node ${uuidToString(node.UUID)} has 2 children)`};
        }
    }
    pollyBtn.classList.remove('btn-secondary');
    pollyBtn.classList.add('btn-success');
    return {valid: true}
}

function createPolyBtn(){
    let validity = checkTreeValidity();
    if (validity.valid){ // tree valid - generate polygon
        createPolygon();
        runLangBtn.style.display = '';
        polygonCanvas.style.display = '';
        polyIsShowing = true;
        document.getElementById('drag').click();
        renderPolygonCanvas();
    } else { // tree invalid - give reason
        displayError(validity.reason);
        polyIsShowing = false;
        runLangBtn.style.display = 'none';
        polygonCanvas.style.display = 'none';
        // TODO: dynamically display polygon when tree is valid
    }
}

function displayError(message){
    let msg = document.getElementById("message");
    msg.innerText = message;
    msg.animate([{opacity:1},{opacity:0}],{duration:8000});
}

function createPolygon(){
    let start = nodes.filter((n)=>n.children.length === 1)[0];
    // acquire sidelengths of polygon by performing a counter-clockwise doubling cycle (DFS)
    sideLengths = [];
    leafNodes = [];
    sideNodes = {};
    CCDoublingCylce(start,(p,n)=>{
        if (p.children.length === 1) leafNodes.push(p);
        let distance = Math.hypot(n.x-p.x,n.y-p.y);
        if(p.children.length === 1){ // if coming from a leaf node...
            sideLengths.push(distance);
        } else {
            sideLengths[sideLengths.length-1] += distance;
        }
        if(n.children.length !== 1){ // add side node
            let vert = leafNodes[leafNodes.length-1];
            sideNodes[vert.UUID] = sideNodes[vert.UUID] || [];
            sideNodes[vert.UUID].push({UUID:n.UUID, ratio:sideLengths[sideLengths.length-1]}); // ratio is not correct yet; need total first
        }
    });
    for(let i = 0; i<leafNodes.length; i++){ // update ratios
        let l = sideLengths[i];
        for(let e of sideNodes[leafNodes[i].UUID]){
            e.ratio /= l;
        }
    }
    // our initial guess for a lang polygon will be the polygon of maximal area - the one inscribed in a circle.
    // Thus, we must find r, the radius of that optimal circle. Then constructing the polygon is trivial.
    let longest = sideLengths.reduce((acc,l,i)=>acc[1]<l?[i,l]:acc,[-1,0]); // longest side length
    let longestIdx = longest[0]; longest = longest[1];
    let r;
    let IASRmin = 0; // Interior Angle Sum at r_{min} = longest/2;
    let perimeter = sideLengths.reduce((acc,s)=>acc+s,0);
    if (leafNodes.length === 3){ // polygon is a triangle. Exact radius can be found (also only one polygon exists)
        let p = perimeter/2;
        let A = Math.sqrt(sideLengths.reduce((acc,s)=>acc*(p-s),p)); // heron's formula
        r = sideLengths.reduce((acc,s)=>acc*s)/(4*A);
    } else {
        IASRmin = sideLengths.reduce((acc,l)=>acc+Math.asin(l/longest),0);
        if (IASRmin === Math.PI){ // center of circle lies on the polygon's longest side
            r = longest/2;
        } else {
            // I don't believe the radius of the circle can be easily found by analytic methods for n-gons of arbitrary n>3
            // Instead, we will use newton's method:
            let error;
            let newton; // functions of r that will return a sense of how far r is from the desired solution
            if (Math.PI < IASRmin) { // center of circle lies within polygon
                error = function (r) {
                    return Math.PI - sideLengths.reduce((acc, l) => acc + Math.asin(l / (2 * r)), 0);
                };
                newton = function (r) {
                    return r *
                        (sideLengths.reduce((acc, l) => acc + Math.asin(l / (2 * r)) + l / (Math.sqrt(4 * r * r - l * l)), 0) - Math.PI) /
                        (sideLengths.reduce((acc, l) => acc + l / Math.sqrt(4 * r * r - l * l), 0));
                }
            } else { // center of circle lies outside of polygon
                error = function (r) {
                    return sideLengths.reduce((acc, l, i) => (acc + (i !== longestIdx ? 1 : -1) * Math.asin(l / (2 * r))), 0);
                };
                newton = function (r) {
                    return r *
                        (sideLengths.reduce((acc, l, i) => acc +
                            (i !== longestIdx ? 1 : -1) *
                            (Math.asin(l / (2 * r)) + l / (Math.sqrt(4 * r * r - l * l))), 0)
                        ) /
                        (sideLengths.reduce((acc, l, i) => acc +
                            (i !== longestIdx ? 1 : -1) *
                            l / Math.sqrt(4 * r * r - l * l), 0)
                        );
                };
            }
            // get a point inside the basin of convergence
            r = perimeter/2;
            let i = 0;
            while (error(r) >= 0 && i<256) r = (r+(longest/2))/2;
            if (i === 256) throw new Error("oh no! failed to find basin of convergence! config:\n" + JSON.stringify(getState()));
            // now run newton until convergence
            let r_prev = new Set();
            i = 0;
            while (!r_prev.has(r) && i<256){
                r_prev.add(r);
                r = newton(r);
                i++;
            }
            if (i === 256) throw new Error("oh no! newton's method broke! config:\n" + JSON.stringify(getState()));
        }
    }
    // calculate points (not yet normalized)
    let angle = 0;
    vertices = [];
    for (let n = 0; n<leafNodes.length; n++){
        vertices.push({
            x:-r*Math.cos(angle),
            y:r*Math.sin(angle),
            ogID: leafNodes[n].UUID, // id of original leaf node
            highlighted: false
        });
        if(n < sideLengths.length){ // increment angle
            if (IASRmin < Math.PI && n === longestIdx) {
                angle -= 2*Math.asin(sideLengths[n]/(2*r));
            } else {
                angle += 2*Math.asin(sideLengths[n]/(2*r));
            }
        }
    }
    // normalize points so that mean is @ origin
    let avg = [0,0];
    for (let p of vertices){avg[0] += p.x; avg[1] += p.y} // get sum of points
    avg[0] /= leafNodes.length; avg[1] /= leafNodes.length; // get average of points
    avg[0] -= 0.5; avg[1] -= polygonCanvas.height/(2*polygonCanvas.width); // get center
    for (let i=0; i<vertices.length; i++){vertices[i].x-=avg[0]; vertices[i].y-=avg[1]} // translate polygon
    // store shortest paths between non-neighboring vertices
    graphDistance = {}; // clear
    for (let i = 0; i<vertices.length; i++){ // iterate through pairs of non-neighboring vertices, (i,j)
        for (let j = i+2; j<vertices.length; j++){
            if ( j === (i + 1) % vertices.length || j === (i + vertices.length - 1) % vertices.length) continue;
            // get nodes corresponding to vertices i and j, (n1,n2)
            let n1id = Math.min(vertices[i].ogID,vertices[j].ogID);
            let n1; for(let node of nodes){if(node.UUID === n1id){n1 = node; break;}}
            let n2id = Math.max(vertices[i].ogID,vertices[j].ogID);
            let n2; for(let node of nodes){if(node.UUID === n2id){n2 = node; break;}}
            // find distance between n1 and n2 in the tree using DFS
            let shortPath = DFS(n1,n2); let d = 0;
            for (let i = 0; i<shortPath.length-1; i++){
                let p = shortPath[i]; let n = shortPath[i+1];
                d += Math.hypot(p.x-n.x,p.y-n.y);
            }
            // store the distance
            graphDistance[i] = (graphDistance[i] || {});
            graphDistance[i][j] = d;
        }
    }
}

function renderPolygonCanvas(){
    // clear canvas
    polyCtx.fillStyle = "#D3D3D3";
    polyCtx.fillRect(0, 0, polygonCanvas.width, polygonCanvas.height);
    let n = vertices.length;
    let p;
    // draw edges
    for (let i = 0; i<n; i++){
        polyCtx.strokeStyle = '#00A2E8';
        polyCtx.lineWidth = 2.5;
        polyCtx.beginPath();
        polyCtx.moveTo(vertices[i % n].x*polygonCanvas.width,vertices[i % n].y*polygonCanvas.width);
        polyCtx.lineTo(vertices[(i+1) % n].x*polygonCanvas.width,vertices[(i+1) % n].y*polygonCanvas.width);
        polyCtx.stroke();
        if (showLabels){ // label the edge with its length TODO
            // polyCtx.textAlign = 'center';
            // polyCtx.lineWidth = 2;
            // let text = Math.sqrt(Math.pow(edge[0].x-edge[1].x,2)+Math.pow(edge[0].y-edge[1].y,2)).toFixed(3)
            // let x = 0.5*(edge[0].x+edge[1].x)*inputCanvas.width;
            // let y = 0.5*(edge[0].y+edge[1].y)*inputCanvas.width;
            // polyCtx.strokeStyle = '#FFFFFF';
            // polyCtx.strokeText(text, x, y);
            // polyCtx.fillStyle = '#000000';
            // polyCtx.fillText(text, x, y)
        }
    }
    // draw lang condition violations
    let langPoly = checkIfLang();
    if (!langPoly.valid){
        polyCtx.strokeStyle = '#FF0000';
        polyCtx.lineWidth = 2.5;
        polyCtx.setLineDash([10,10]);
        for(let p of langPoly.violators){
            polyCtx.beginPath();
            polyCtx.moveTo(p.v1.x*polygonCanvas.width, p.v1.y*polygonCanvas.width);
            polyCtx.lineTo(p.v2.x*polygonCanvas.width, p.v2.y*polygonCanvas.width);
            polyCtx.stroke();
        }
        polyCtx.setLineDash([]);
    }
    // draw leaf nodes / vertices
    for (let vertex of vertices){
        // draw circle at node
        polyCtx.fillStyle = 'rgb(34,177,76)';
        polyCtx.beginPath();
        polyCtx.arc(vertex.x*inputCanvas.width, vertex.y*inputCanvas.width, nodeRadius, 0, 2 * Math.PI, false);
        polyCtx.fill();
        // draw transparent circle around node
        polyCtx.fillStyle = 'rgba(34,177,76,0.25)';
        if (vertex.highlighted){
            polyCtx.fillStyle = 'rgb(34,177,76)';
        }
        polyCtx.arc(vertex.x*inputCanvas.width, vertex.y*inputCanvas.width, 2*nodeRadius, 0, 2 * Math.PI, false);
        polyCtx.fill();
        if(showLabels){
            polyCtx.textAlign = 'center';
            polyCtx.lineWidth = 2;
            let text = uuidToString(vertex.ogID) + "'";
            let x = vertex.x*inputCanvas.width;
            let y = vertex.y*inputCanvas.width;
            polyCtx.strokeStyle = '#FFFFFF';
            polyCtx.strokeText(text, x, y);
            polyCtx.fillStyle = '#000000';
            polyCtx.fillText(text, x, y);
        }
    }
    // draw side nodes
    for(let i = 0; i<leafNodes.length; i++){
        let v1 = vertices[i]; let v2 = vertices[(i+1) % vertices.length];
        for(let e of sideNodes[v1.ogID]){
            // draw side node
            let x = ((1-e.ratio)*v1.x + e.ratio*v2.x)*inputCanvas.width;
            let y = ((1-e.ratio)*v1.y + e.ratio*v2.y)*inputCanvas.width;
            polyCtx.fillStyle = '#00A2E8';
            polyCtx.beginPath();
            polyCtx.arc(x, y, nodeRadius, 0, 2 * Math.PI, false);
            polyCtx.fill();
            if(showLabels){
                polyCtx.textAlign = 'center';
                polyCtx.lineWidth = 2;
                polyCtx.strokeStyle = '#FFFFFF';
                let text = uuidToString(e.UUID) + "'";
                polyCtx.strokeText(text, x, y);
                polyCtx.fillStyle = '#000000';
                polyCtx.fillText(text, x, y)
            }
        }
    }
}

function handlePolyMouseDown(e){
    let x = e.offsetX/polygonCanvas.width; let y = e.offsetY/polygonCanvas.width; // get click coordinates
    function selectNearestVertex(){
        selectedVertex = null; let minDistance = Infinity;
        for (let vertex of vertices){
            // good ol' euclidean distance
            let distance = Math.hypot(vertex.x-x, vertex.y-y);
            if (distance < minDistance && polygonCanvas.width*distance < 2.5*nodeRadius){
                minDistance = distance;
                selectedVertex = vertex;
                dragOffsets[0] = vertex.x-x;
                dragOffsets[1] = vertex.y-y;
            }
        }
    }
    selectNearestVertex();
    if(selectedVertex) selectedVertex.highlighted = true;
}
function checkIfLang(){
    runLangBtn.classList.remove('btn-success');
    runLangBtn.classList.add('btn-secondary');
    let validity = {valid: true, message:null, violators: []};
    for(let i = 0; i<vertices.length; i++){
        for(let j = i+2; j<vertices.length; j++){
            if( j === (i + 1) % vertices.length || j === (i + vertices.length - 1) % vertices.length) continue; // skip over neighboring pairs
            let v1 = vertices[i]; let v2 = vertices[j];
            let dPaper = Math.hypot(v1.x-v2.x,v1.y-v2.y);
            let dGraph = graphDistance[i][j];
            if(dPaper < dGraph){
                validity.valid = false;
                // TODO handle precision dynamically
                validity.message = validity.message || `${uuidToString(v1.ogID)}'${uuidToString(v2.ogID)}'=${dPaper.toFixed(3)}<` +
                `${uuidToString(v1.ogID)}${uuidToString(v2.ogID)}=${dGraph.toFixed(3)}`;
                validity.violators.push({v1:v1,v2:v2})
            }
        }
    }
    if (validity.valid){
        runLangBtn.classList.remove('btn-secondary');
        runLangBtn.classList.add('btn-success');
    }
    return validity;
}
function handlePolyMousemove(e){
    let x = e.offsetX/polygonCanvas.width; let y = e.offsetY/polygonCanvas.width; // get mouse coordinates
    if (selectedVertex){
        x+=dragOffsets[0]; y+=dragOffsets[1];
        let vidx = vertices.indexOf(selectedVertex); let n = vertices.length;
        let h1 = sideLengths[vidx]; let h2 = sideLengths[(vidx + n - 1) % n]; // a is for "foreArm" length
        let a1 = sideLengths[(vidx + 1) % n]; let a2 = sideLengths[(vidx + n - 2) % n]; // h is for "humorous" length
        let e1 = vertices[(vidx + 1) % n]; let e2 = vertices[(vidx + n - 1) % n]; // e is for "elbow" vertex
        let s1 = vertices[(vidx + 2) % n]; let s2 = vertices[(vidx + n - 2) % n]; // s is for "shoulder" vertex
        let d1 = Math.hypot(x-s1.x, y-s1.y); let d2 = Math.hypot(x-s2.x, y-s2.y);
        if (
            Math.abs(h1-a1) < d1 && d1 < h1+a1 && // distance between hand and shoulder less than sum of line segments
            Math.abs(h2-a2) < d2 && d2 < h2+a2
        ){ // constraint not violated / polygon not broken. we can update verticies
            selectedVertex.x = x; selectedVertex.y = y;
            let x1 = x-s1.x; let x2 = x-s2.x; let y1 = y-s1.y; let y2 = y-s2.y // translate selected vertex such that shoulders are at origin
            let r1 = x1*x1 + y1*y1; let r2 = x2*x2 + y2*y2; // helper variable r
            let p1 = a1*a1 - h1*h1; let p2 = a2*a2 - h2*h2; // helper variable p
            let q1 = r1+p1; let q2 = r2+p2; // yet another helper variable q
            let x1d = (x1*q1+y1*Math.sqrt(4*a1*a1*r1-q1*q1))/(2*r1);
            let y1d = (y1*q1-x1*Math.sqrt(4*a1*a1*r1-q1*q1))/(2*r1);
            let x2d = (x2*q2-y2*Math.sqrt(4*a2*a2*r2-q2*q2))/(2*r2);
            let y2d = (y2*q2+x2*Math.sqrt(4*a2*a2*r2-q2*q2))/(2*r2);
            e1.x = s1.x + x1d; e1.y = s1.y + y1d; // update elbow 1
            e2.x = s2.x + x2d; e2.y = s2.y + y2d; // update elbow 2
            renderPolygonCanvas();
            checkIfLang();
        }
        x-=dragOffsets[0]; y-=dragOffsets[1];
    }
    polygonCanvas.style.cursor = "auto";
    for (let vertex of vertices){
        let d = Math.hypot(vertex.x-x,vertex.y-y);
        if (d*polygonCanvas.width < 2.5*nodeRadius){
            polygonCanvas.style.cursor = "all-scroll";
        }
    }
}
function handlePolyMouseup(e){
    if (selectedVertex){
        selectedVertex.highlighted = false;
        selectedVertex = null;
    }
    renderPolygonCanvas();
}
polygonCanvas.addEventListener("mousedown",handlePolyMouseDown);
polygonCanvas.addEventListener("mousemove",handlePolyMousemove);
polygonCanvas.addEventListener("mouseup",handlePolyMouseup);

function runLang(){
    let validity = checkIfLang();
    if (validity.valid){
        // TODO actually implement lang's alg
    } else {
        displayError(validity.message);
    }
}

runLangBtn.addEventListener("click",runLang);
runLangBtn.addEventListener("click",runLang);
//}