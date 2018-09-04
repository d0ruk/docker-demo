const Koa = require("koa");

export default () => new Koa().
  use(async (ctx, next) => {
    if (ctx.request.URL.searchParams.has("reset")) {
      // curl localhost:8000/visit?reset
      await next();
    } else {
      await ctx.db.incrAsync("acc");
    }

    ctx.body = `${await ctx.db.getAsync("acc")}\n`;
  }).
  use(async (ctx, next) => {
    await ctx.db.setAsync("acc", 0);
    await next();
  });
