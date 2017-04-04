#!/bin/bash
kill $(pidof node server.js)
git pull
nohup node server.js &