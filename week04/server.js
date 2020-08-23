const http = require('http');

http.createServer((request, response) => {
    let body = [];
    request.on('error', error => {
        console.error(err)
    }).on('data', chunk => {
        console.log(chunk.toString())
        body.push(chunk.toString())
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        console.log('body', body);
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(`<html ssss=a >
        <head>
            <style>
    #test{
        width: 100px;
        background-color: #ff5000;
    }
    body div img{
        width: 30px;
        background-color: #ff1111;
    }
    img{
        color: red;
    }
            </style>
        </head>
        <body>
            <div class="a">
                <img id="test"/>
            </div>
        </body>
    </html>`);
    })
}).listen(8088)

console.log('server start ...')