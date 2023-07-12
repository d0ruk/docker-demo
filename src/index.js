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
const { name } = require("../package.json")
const config = require("rc")(name, {
  port: 8080,
  redis_url: "",// "redis://localhost:6379/1",
  isProd: process.env.NODE_ENV === "production"
});

module.exports = {
  config,
}

const app = require("./app.js").default;
const PORT = config.port
app.listen(PORT);
console.log(`Listening on ${PORT} in ${process.env.NODE_ENV}`); // eslint-disable-line
