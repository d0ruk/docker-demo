require("@babel/register")({
  presets: [
    [
      "@babel/preset-env",
      {
        corejs: 3,
        // debug: true
        targets: { node: "8.11" },
        useBuiltIns: "entry",
      },
    ],
  ],
});

const port = process.env.PORT || 11111;
const app = require("./app.js").default;

app.listen(port);
console.log(`Listening on ${port}`); // eslint-disable-line
