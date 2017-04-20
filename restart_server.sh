#!/bin/bash
kill $(pidof node server.js)
nohup node server.js &