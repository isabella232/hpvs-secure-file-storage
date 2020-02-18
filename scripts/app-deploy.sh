#!/bin/bash

name=hpvs-secure-file-storage
log_file=$name.$(date +%Y%m%d_%H%M%S).log
exec 3>&1 1>>$log_file 2>&1

function log_info {
  printf "\e[1;34m$(date '+%Y-%m-%d %T') %s\e[0m\n" "$@" 1>&3
}

function log_success {
  printf "\e[1;32m$(date '+%Y-%m-%d %T') %s\e[0m\n" "$@" 1>&3
}

function log_warning {
  printf "\e[1;33m$(date '+%Y-%m-%d %T') %s\e[0m\n" "$@" 1>&3
}

function log_error {
  printf >&2 "\e[1;31m$(date '+%Y-%m-%d %T') %s\e[0m\n" "$@" 1>&3
}

function installApp {
  log_info "Running apt-get update."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  [ $? -ne 0 ] && log_error "apt-get update command execution error." && return 1

  log_info "Running apt-get install nodejs."
  apt-get install nodejs npm -y
  [ $? -ne 0 ] && log_error "apt-get install command execution error." && return 1

  log_info "Running pm2 install."
  npm install pm2@latest -g
  [ $? -ne 0 ] && log_error "npm install command execution error." && return 1

  log_info "Running npm install."
  npm install --no-optional
  [ $? -ne 0 ] && log_error "npm install command execution error." && return 1

  log_info "Configuring app to run as a service"
  pm2 start app.js
  pm2 startup systemd
  pm2 save

  return 0
}

function first_boot_setup {
  log_info "Started $name app configuration"

  installApp
  [ $? -ne 0 ] && log_error "Failed app installation, review log file $log_file." && return 1

  return 0
}

first_boot_setup
[ $? -ne 0 ] && log_error "$name app deploy had errors." && exit 1

log_info "Completed $name app configuration."

exit 0