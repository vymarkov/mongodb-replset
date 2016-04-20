#!/usr/local/bin/ruby -w
# -*- mode: ruby -*-
# vi: set ft=ruby :

unless Vagrant.has_plugin?("vagrant-docker-compose")
  system("vagrant plugin install vagrant-docker-compose")
  puts "Dependencies installed, please try the command again."
  exit
end

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  # config.vm.network "private_network", ip: "192.168.33.10"

  config.vm.network(:forwarded_port, guest: 8500, host: 8500, auto_correct: true)
  config.vm.network(:forwarded_port, guest: 3000, host: 3000, auto_correct: true)

  # Share an additional folder to the guest VM. The first argument is
  # the path on the host to the actual folder. The second argument is
  # the path on the guest to mount the folder. And the optional third
  # argument is a set of non-required options.
  # config.vm.synced_folder "../data", "/vagrant_data"
  config.vm.synced_folder ".", "/home/vagrant/app"

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  config.vm.provider "virtualbox" do |vb|
    # Display the VirtualBox GUI when booting the machine
    # vb.gui = true

    # Customize the amount of memory on the VM:
    vb.memory = "2048"
    vb.cpus = 1
  end

  # config.vm.provision :shell, privileged: false, inline: <<-SCRIPT
  # SCRIPT

  config.vm.provision :shell, privileged: false, inline: <<-SCRIPT
    sudo apt-get update
    sudo apt-get install -y mongodb-clients redis-tools curl unzip httpie python-pygments git-core git-flow mercurial make libssl-dev git g++ libkrb5-dev golang
    curl -L http://git.io/n-install | bash -s -- -y 0.12

    cd /usr/local/bin/
    sudo curl -OL https://releases.hashicorp.com/consul/0.5.2/consul_0.5.2_linux_amd64.zip
    sudo unzip consul_0.5.2_linux_amd64.zip
    sudo apt-get install -y python-pip
    sudo pip install --upgrade --force-reinstall docker-compose httpie
    wget https://github.com/direnv/direnv/archive/v2.7.0.zip && unzip v2.7.0.zip && cd direnv-2.7.0 && sudo make install

    echo 'eval "$(direnv hook bash)"' >> $HOME/.bashrc

    echo 'export LC_ALL=en_US.UTF-8' >> $HOME/.bashrc
    echo 'export LANGUAGE=en_US.UTF-8' >> $HOME/.bashrc
    echo 'export MONGO_REPLSET_NAME=rs0' >> $HOME/.bashrc
    echo 'export MONGO_PORT=27001' >> $HOME/.bashrc
    echo 'export COMPOSE_PROJECT_NAME=magnesium' >> $HOME/.bashrc
    echo 'export COMPOSE_FILE=/home/vagrant/app/docker-compose.yml' >> $HOME/.bashrc
SCRIPT

  config.vm.provision :docker
  config.vm.provision :docker_compose, yml: "/home/vagrant/app/docker-compose.yml", rebuild: false, project_name: "magnesium", run: "always"
end