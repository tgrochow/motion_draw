#!/bin/bash
kill $(pidof "node server.js")
git pull
node server.js