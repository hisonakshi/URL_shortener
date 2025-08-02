import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";

const DATA_FILE = path.resolve("data", "links.json");

const serveFile = async (res, filePath, contentType) => {
  try {
    const data = await readFile(path.resolve(filePath));
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    res.writeHead(400, { 'Content-Type': contentType });
    res.end('400 page not found');
  }
};

const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  console.log(req.url);

  if (req.method === "GET") {
    if (req.url === "/") {
      return serveFile(res, "public/index.html", "text/html");
    } else if (req.url === "/style.css") {
      return serveFile(res, "public/style.css", "text/css");
    } else if(req.url === "/links") {

        const links = await loadLinks()
        res.writeHead(200,{"Content-Type":"application/json"});
        return res.end(JSON.stringify(links))
    } else {
        const links = await loadLinks();
        const shortCode = req.url.slice(1);
        console.log("links red.",req.url);

       if(links[shortCode]){
        res.writeHead(302,{location:links[shortCode]});
        return res.end();
       }

       res.writeHead(404,{"Content-Type":"text/plain"});
       return res.end("Shortened URL not found");
    }
  }

  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadLinks();

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const { url, shortCode } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end("URL is required");
        }

        const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

        if (links[finalShortCode]) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end("Short code already exists, please try another");
        }

        links[finalShortCode] = url;
        await saveLinks(links);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end("Internal server error");
        console.error(err);
      }
    });
  }
});

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
