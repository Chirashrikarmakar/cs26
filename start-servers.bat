@echo off
cd /d %~dp0server
start "OAQ-SERVER" cmd /C "npm run dev"
cd /d %~dp0client
start "OAQ-CLIENT" cmd /C "npm run dev"
echo Servers starting...
pause