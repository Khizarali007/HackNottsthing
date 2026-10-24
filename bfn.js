const express = require('express');
const cors = require('cors')

const { spawn } = require('child_process')

const app = express();

const child = spawn('git', ['log', '--pretty=format:"%H|%P|%an|%ad|%s"'])

child.stdout.on("data", (data) => {
    let something = data.toString();
    let smth = something.split("|");
    console.log(`stdout: ${data}`);

    let jsonarr = [
        {
            "id": smth[0],
            "parents": smth[1], // Array of strings. Empty for initial commit. Multiple for merges.
            "author": smth[2],
            "date": smth[3],
            "message": smth[4],
            "linesAdded": smth[5],
            "linesDeleted": smth[6],
            "aiCategory": null // Always return null. 

        }]
});
child.stderr.on("data", (data) => {
    console.log(`stdout: ${data}`);
});
child.on("exit", (code) => {
    console.log(`Process ended with ${code}`);
});


console.log(child.stdout.read())
