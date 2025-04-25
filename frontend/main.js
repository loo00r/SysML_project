function init() {
    const $ = go.GraphObject.make;
    const myDiagram = $(go.Diagram, "myDiagramDiv", {
      "undoManager.isEnabled": true
    });
  
    myDiagram.model = new go.GraphLinksModel(
      [
        { key: "Block A" },
        { key: "Block B" }
      ],
      [
        { from: "Block A", to: "Block B" }
      ]
    );
  }
  
  window.addEventListener('DOMContentLoaded', init);
  