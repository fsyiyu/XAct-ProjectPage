window.XACT_VIDEO_GALLERIES = (function () {
  var categories = {
    h2h: { title: "Human → Human · 人人迁移", ids: ["0004", "0005", "0006", "0009", "0012", "0018", "0028"] },
    h2r: { title: "Human → Robot · 人→机迁移", ids: ["0001", "0010", "0011", "0012", "0014"] },
    r2r: { title: "Robot → Robot · 机机迁移", ids: ["0009", "0017", "0019", "0027", "0029", "0035"] }
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
          title: "示例 " + id,
          mode: "pair",
          left: "assets/media/demo/" + cat + "/" + id + "-input.mp4",
          right: "assets/media/demo/" + cat + "/" + id + "-output.mp4",
          flow: "assets/media/demo/" + cat + "/" + id + "-flow.mp4",
          rightLabel: "Result"
        };
      })
    };
  });
  return galleries;
})();
