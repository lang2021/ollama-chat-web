@echo off
setlocal
cd /d "%~dp0"
set PORT=8765
title Ollama Chat Web Server

echo Starting local server at http://127.0.0.1:%PORT%
echo Keep this window open while using the chat page.
start "" http://127.0.0.1:%PORT%
py -m http.server %PORT%
