const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:50352" }));
app.use(express.json());

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

app.get("/auth/github", (req, res) => {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;
  res.redirect(authUrl);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      null,
      {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
        },
        headers: {
          Accept: "application/json",
        },
      }
    );

    const { access_token } = response.data;

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user = userResponse.data;
    res.json({ access_token, user });
  } catch (error) {
    console.error("Error during OAuth process:", error);
    res.status(500).json({ error: "Failed to authenticate with GitHub" });
  }
});

// app.post("/push-pipeline", async (req, res) => {
//   const { access_token, repoOwner, repoName, filePath, yamlContent } = req.body;

//   try {
//     const base64Content = Buffer.from(yamlContent).toString("base64");
    
//     const githubApiUrl = `https://api.github.com/repos/gaurav-devmurari/appSpace/contents/yaml/pipeline.yaml`;
    
//     const fileResponse = await axios.get(githubApiUrl, {
//       headers: { Authorization: `Bearer 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` },
//     });

//     const sha = fileResponse.data.sha; 
    
//     const updateResponse = await axios.put(
//       githubApiUrl,
//       {
//         message: "Update pipeline YAML file",
//         content: base64Content,
//         sha, 
//       },
//       {
//         headers: { Authorization: `Bearer ${access_token}` },
//       }
//     );

//     res.json({
//       message: "Pipeline YAML file updated successfully on GitHub",
//       data: updateResponse.data,
//     });
//   } catch (error) {
    
//     if (error.response && error.response.status === 404) {
//       try {
        
//         const createResponse = await axios.put(
//           githubApiUrl,
//           {
//             message: "Add new pipeline YAML file",
//             content: base64Content,
//           },
//           {
//             headers: { Authorization: `Bearer ${access_token}` },
//           }
//         );
//         res.json({
//           message: "Pipeline YAML file created successfully on GitHub",
//           data: createResponse.data,
//         });
//       } catch (createError) {
//         console.error("Error creating pipeline file on GitHub:", createError?.response?.data || createError);
//         res.status(500).json({ error: "Failed to create pipeline YAML file on GitHub" });
//       }
//     } else {
//       console.error("Error pushing pipeline YAML to GitHub:", error?.response?.data || error);
//       res.status(500).json({ error: "Failed to push pipeline YAML file to GitHub" });
//     }
//   }
// });

app.post("/create-pipeline", async (req, res) => {
  const {
    token, 
    owner, 
    repo,  
    branch,
    yamlContent 
  } = req.body;

  const filePath = "my-folder/ci-pipeline.yaml";  
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const encodedContent = Buffer.from(yamlContent).toString("base64");

  try {
    let sha = null;
    try {
      const existingFile = await axios.get(apiUrl, {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      sha = existingFile.data.sha;
    } catch (err) {
      if (err.response?.status !== 404) {
        throw err;
      }
    }

    const response = await axios.put(
      apiUrl,
      {
        message: "Create or update custom YAML file",
        content: encodedContent,
        branch: branch,
        ...(sha ? { sha } : {}), 
      },
      {
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      message: "YAML file created or updated successfully",
      url: response.data.content.html_url,
    });
  } catch (error) {
    console.error("Error pushing file:", error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
});

// app.post("/get-pipeline-content", async (req, res) => {
//   const {
//     token,  
//     owner, 
//     repo,  
//     branch,
//     path    
//   } = req.body;

//   const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

//   try {
//     const response = await axios.get(apiUrl, {
//       headers: {
//         Authorization: `token ${token}`,
//         Accept: "application/vnd.github.v3+json",
//       },
//     });

//     const fileContentBase64 = response.data.content;
//     const decodedContent = Buffer.from(fileContentBase64, 'base64').toString('utf8');

//     return res.status(200).json({
//       exists: true,
//       content: decodedContent,
//     });
//   } catch (err) {
//     if (err.response?.status === 404) {
//       return res.status(200).json({
//         exists: false,
//         message: "File not found",
//       });
//     }

//     return res.status(500).json({
//       error: err.message,
//       details: err.response?.data || {},
//     });
//   }
// });

// app.post("/check-yaml-exists", async (req, res) => {
//   const {
//     token,  
//     owner,  
//     repo,   
//     branch, 
//     path    
//   } = req.body;

//   const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

//   try {
//     await axios.get(apiUrl, {
//       headers: {
//         Authorization: `token ${token}`,
//         Accept: "application/vnd.github.v3+json",
//       },
//     });

//     return res.status(200).json({
//       exists: true,
//       message: "YAML file exists",
//     });

//   } catch (err) {
//     if (err.response?.status === 404) {
//       return res.status(200).json({
//         exists: false,
//         message: "YAML file not found",
//       });
//     }

//     return res.status(500).json({
//       error: err.message,
//       details: err.response?.data || {},
//     });
//   }
// });

app.post("/check-and-get-pipeline", async (req, res) => {
  const {
    token,
    owner,
    repo,
    branch,
    path
  } = req.body;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const fileContentBase64 = response.data.content;
    const decodedContent = Buffer.from(fileContentBase64, 'base64').toString('utf8');

    return res.status(200).json({
      exists: true,
      message: "File exists",
      content: decodedContent,
    });

  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(200).json({
        exists: false,
        message: "File not found",
      });
    }

    return res.status(500).json({
      error: err.message,
      details: err.response?.data || {},
    });
  }
});


app.get("/health", (req, res) => {
  res.send("API is healthy!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
