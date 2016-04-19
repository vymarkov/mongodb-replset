var Docker = require('dockerode');
var docker = new Docker({
  socketPath: '/var/run/docker.sock'
});

docker.listContainers(function(err, containers) {
  if (err) {
    return console.error(err.stack);
  }

  console.log(containers);

  containers.forEach(function(info) {
    var container = docker.getContainer(info.Id);

    container.stop(function(err) {
      if (err) {
        return console.error(err.stack);
      }

      container.remove(function() {});
    });
  });
});
