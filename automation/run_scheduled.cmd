@echo off
cd /d "%~dp0"
py -3 automation.py run --input data\production_batch.json
