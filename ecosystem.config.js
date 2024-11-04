module.exports = {
  apps : [{
    name   : "app1",
    script : "./src/main.ts",
    env: {
      PORT: 3000,
    },
    instances: 1
  },
  {
    name   : "app2",
    script : "./src/main.ts",
    env: {
      PORT: 3001,
    },
    instances: 1
  }]
}
