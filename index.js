require("@babel/register")({
  presets: [
    ["@babel/preset-env", {
      targets: { node: "current" },
      useBuiltIns: "entry",
      // debug: true
    }]
  ]
});

const port = process.env.PORT || 11111;
const app = require("./app.js").default;

app.listen(port);
console.log(`Listening on ${port}`);
