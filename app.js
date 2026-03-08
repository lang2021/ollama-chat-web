const state = {
  messages: [
    {
      role: "assistant",
      content: "你好，我已经准备好了。启动 Ollama 后，输入消息就可以和本地模型对话。",
    },
  ],
  isSending: false,
};

const elements = {
  messages: document.getElementById("messages"),
  form: document.getElementById("chatForm"),
  prompt: document.getElementById("promptInput"),
  sendButton: document.getElementById("sendButton"),
  clearButton: document.getElementById("clearButton"),
  checkButton: document.getElementById("checkButton"),
  baseUrl: document.getElementById("baseUrlInput"),
  model: document.getElementById("modelInput"),
  statusText: document.getElementById("statusText"),
  statusDot: document.getElementById("statusDot"),
  hintText: document.getElementById("hintText"),
};

function getBaseUrl() {
  return elements.baseUrl.value.trim().replace(/\/$/, "");
}

function getModel() {
  return elements.model.value.trim() || "qwen3.5:9b";
}

function setStatus(mode, text) {
  elements.statusText.textContent = text;
  elements.statusDot.classList.remove("online", "offline");
  if (mode === "online") {
    elements.statusDot.classList.add("online");
  }
  if (mode === "offline") {
    elements.statusDot.classList.add("offline");
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(text) {
  const normalized = (text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n");
  const html = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  function closeCodeBlock() {
    if (inCodeBlock) {
      html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
      codeBuffer = [];
      inCodeBlock = false;
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      closeList();
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }

  closeList();
  closeCodeBlock();
  return html.join("\n");
}

function isCjkToken(token) {
  return /^[\u3400-\u9fff]+$/u.test(token);
}

function isAsciiJoinToken(token) {
  return /^[A-Za-z0-9._:+-]+$/.test(token);
}

function isClosingPunctuation(token) {
  return /^[,，.。!！?？;；:：、)\]）】》」』”]+$/u.test(token);
}

function isOpeningPunctuation(token) {
  return /^[([{（【《「『“]+$/u.test(token);
}

function shouldJoinWithoutSpace(previous, current) {
  if (!previous) {
    return true;
  }

  if (isClosingPunctuation(current) || isOpeningPunctuation(previous)) {
    return true;
  }

  if (isCjkToken(previous) && isCjkToken(current)) {
    return true;
  }

  if (isAsciiJoinToken(previous) && isAsciiJoinToken(current)) {
    return true;
  }

  if ((isCjkToken(previous) && isAsciiJoinToken(current)) || (isAsciiJoinToken(previous) && isCjkToken(current))) {
    return true;
  }

  return false;
}

function normalizeTokenizedParagraph(paragraph) {
  const tokens = paragraph.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  let result = "";
  let previousToken = "";

  for (const token of tokens) {
    if (!result || shouldJoinWithoutSpace(previousToken, token)) {
      result += token;
    } else {
      result += ` ${token}`;
    }
    previousToken = token;
  }

  return result
    .replace(/\s+([，。！？；：、,.!?;:])/g, "$1")
    .replace(/([（【《「『“])\s+/g, "$1")
    .replace(/\s+([）】》」』”])/g, "$1")
    .trim();
}

function normalizeModelText(text) {
  const normalized = (text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "";
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => normalizeTokenizedParagraph(paragraph))
    .filter(Boolean);

  return paragraphs.join("\n\n");
}

function parseAssistantContent(rawText) {
  const text = rawText || "";
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi;
  const thinkingChunks = [];
  let cleanedText = text;
  let hasOpenThink = false;
  let match;

  while ((match = thinkRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const thinkContent = match[1] || "";
    const isClosed = fullMatch.endsWith("</think>");
    thinkingChunks.push(thinkContent);
    if (!isClosed) {
      hasOpenThink = true;
    }
  }

  cleanedText = cleanedText.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleanedText = cleanedText.replace(/<think>[\s\S]*$/gi, "");
  cleanedText = normalizeModelText(cleanedText);

  return {
    answer: cleanedText,
    thinking: normalizeModelText(thinkingChunks.join("")),
    hasOpenThink,
  };
}

function renderMessageBody(container, content) {
  container.innerHTML = "";
  const parsed = parseAssistantContent(content);

  if (parsed.thinking) {
    const details = document.createElement("details");
    details.className = "think-block";
    details.open = parsed.hasOpenThink;

    const summary = document.createElement("summary");
    summary.textContent = parsed.hasOpenThink ? "思考中，点击展开" : "查看思考过程";

    const thinkContent = document.createElement("div");
    thinkContent.className = "think-content";
    thinkContent.innerHTML = renderMarkdown(parsed.thinking);

    details.append(summary, thinkContent);
    container.appendChild(details);
  }

  const answer = document.createElement("div");
  answer.className = "message-answer";
  answer.innerHTML = renderMarkdown(parsed.answer || (parsed.hasOpenThink ? "正在生成正式回复..." : "(空回复)"));
  container.appendChild(answer);
}

function createMessageElement(role, content) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const roleEl = document.createElement("div");
  roleEl.className = "message-role";
  roleEl.textContent = role;

  const bodyEl = document.createElement("div");
  bodyEl.className = "message-body";

  if (role === "assistant") {
    renderMessageBody(bodyEl, content);
  } else {
    bodyEl.textContent = content;
  }

  article.append(roleEl, bodyEl);
  return { article, bodyEl };
}

function appendMessage(role, content) {
  const { article, bodyEl } = createMessageElement(role, content);
  elements.messages.appendChild(article);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  return bodyEl;
}

function updateAssistantBody(bodyEl, content) {
  renderMessageBody(bodyEl, content);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function clearConversation() {
  state.messages = [];
  elements.messages.innerHTML = "";
  const intro = "你好，我已经准备好了。启动 Ollama 后，输入消息就可以和本地模型对话。";
  state.messages.push({ role: "assistant", content: intro });
  appendMessage("assistant", intro);
}

async function checkConnection() {
  const baseUrl = getBaseUrl();
  setStatus("", "正在检查 Ollama...");

  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const currentModel = getModel();
    const matched = Array.isArray(data.models)
      ? data.models.find((item) => item.name === currentModel)
      : null;

    if (matched) {
      setStatus("online", `已连接，检测到模型 ${currentModel}`);
    } else {
      setStatus("online", `已连接，但未在列表中看到 ${currentModel}`);
    }
  } catch (error) {
    setStatus("offline", `连接失败：${error.message}`);
  }
}

function setSending(isSending) {
  state.isSending = isSending;
  elements.sendButton.disabled = isSending;
  elements.checkButton.disabled = isSending;
  elements.prompt.disabled = isSending;
  elements.hintText.textContent = isSending ? "模型正在回复，请稍候..." : "Shift + Enter 换行，Enter 发送";
}

function extractChunk(payload) {
  const message = payload.message || {};
  const contentChunk = message.content || "";
  const thinkingChunk = message.thinking || message.reasoning || message.reasoning_content || "";

  if (thinkingChunk) {
    return `<think>${thinkingChunk}</think>${contentChunk}`;
  }

  return contentChunk;
}

async function sendMessage(prompt) {
  const baseUrl = getBaseUrl();
  const model = getModel();

  state.messages.push({ role: "user", content: prompt });
  appendMessage("user", prompt);

  const assistantBody = appendMessage("assistant", "");
  setSending(true);
  setStatus("", `正在调用 ${model}...`);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: state.messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullReply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        const payload = JSON.parse(line);
        const chunk = extractChunk(payload);
        if (chunk) {
          fullReply += chunk;
          updateAssistantBody(assistantBody, fullReply);
        }
      }
    }

    if (buffer.trim()) {
      const payload = JSON.parse(buffer);
      const chunk = extractChunk(payload);
      if (chunk) {
        fullReply += chunk;
        updateAssistantBody(assistantBody, fullReply);
      }
    }

    state.messages.push({ role: "assistant", content: fullReply || "(空回复)" });
    setStatus("online", `回复完成，当前模型 ${model}`);
  } catch (error) {
    assistantBody.textContent = `请求失败：${error.message}`;
    assistantBody.parentElement.classList.add("system");
    setStatus("offline", `发送失败：${error.message}`);
  } finally {
    setSending(false);
    elements.prompt.focus();
  }
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.isSending) {
    return;
  }

  const prompt = elements.prompt.value.trim();
  if (!prompt) {
    return;
  }

  elements.prompt.value = "";
  await sendMessage(prompt);
});

elements.prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.form.requestSubmit();
  }
});

elements.clearButton.addEventListener("click", () => {
  clearConversation();
});

elements.checkButton.addEventListener("click", () => {
  checkConnection();
});

checkConnection();

