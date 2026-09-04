window.XACT_VIDEO_GALLERIES = (function () {
  var categories = {
    h2h: { title: "Human → Human", ids: ["0004", "0005", "0006", "0009", "0012", "0018", "0028"] },
    h2r: { title: "Human → Robot", ids: ["0001", "0010", "0011", "0012", "0014"] },
    r2r: { title: "Robot → Robot", ids: ["0009", "0017", "0019", "0027", "0029", "0035"] }
  };
  var galleries = {};
  Object.keys(categories).forEach(function (cat) {
    var config = categories[cat];
    galleries[cat] = {
      id: cat,
      title: config.title,
      scenes: config.ids.map(function (id) {
        return {
          id: id,
          title: "Example " + id,
          mode: "pair",
          left: "assets/media/demo/" + cat + "/" + id + "-input.mp4",
          right: "assets/media/demo/" + cat + "/" + id + "-output.mp4",
          flow: "assets/media/demo/" + cat + "/" + id + "-flow.mp4",
          rightLabel: "output"
        };
      })
    };
  });
  return galleries;
})();
