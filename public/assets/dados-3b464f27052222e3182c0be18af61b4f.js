function draw(){
var g = new dagreD3.Digraph();

g.addNode("kspacey",    { label: "Kevin Spacey" });
g.addNode("swilliams",  { label: "Saul Williams" });
g.addNode("bpitt",      { label: "Brad Pitt" });
g.addNode("hford",      { label: "Harrison Ford" });
g.addNode("lwilson",    { label: "Luke Wilson" });
g.addNode("kbacon",     { label: "Kevin Bacon" });

g.addEdge(null, "kspacey",   "swilliams", { label: "K-PAX" });
g.addEdge(null, "swilliams", "kbacon",    { label: "These Vagabond Shoes" });
g.addEdge(null, "bpitt",     "kbacon",    { label: "Sleepers" });
g.addEdge(null, "hford",     "lwilson",   { label: "Anchorman 2" });
g.addEdge(null, "lwilson",   "kbacon",    { label: "Telling Lies in America" });

var renderer = new dagreD3.Renderer();
renderer.run(g, d3.select("svg g"));
}
;
