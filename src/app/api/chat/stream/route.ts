import { addConversation, addMessage, updateConversationTitle } from '../../mockData';

function sseEvent(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 判断用户消息是否触发工具调用的 mock 场景
function detectScenario(message: string): 'search' | 'code' | 'image' | 'plain' {
  const lower = message.toLowerCase();
  if (lower.includes('搜') || lower.includes('search') || lower.includes('查')) return 'search';
  if (lower.includes('代码') || lower.includes('code') || lower.includes('写') || lower.includes('python') || lower.includes('script')) return 'code';
  if (lower.includes('图') || lower.includes('画') || lower.includes('image') || lower.includes('chart')) return 'image';
  return 'plain';
}

export async function POST(request: Request) {
  const { conversationId, message } = await request.json();

  let convId = conversationId;
  const isNew = !convId;

  if (isNew) {
    convId = `conv-${Date.now()}`;
    addConversation({
      id: convId,
      title: '新对话',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Save user message
  addMessage(convId, {
    id: `msg-${Date.now()}`,
    conversationId: convId,
    role: 'user',
    content: message,
    createdAt: new Date().toISOString(),
  });

  const assistantMessageId = `msg-${Date.now() + 1}`;
  const scenario = detectScenario(message);

  const stream = new ReadableStream({
    async start(controller) {
      // Send stream_start
      controller.enqueue(sseEvent({
        type: 'stream_start',
        messageId: assistantMessageId,
        conversationId: isNew ? convId : undefined,
      }));

      let assistantContent = '';

      if (scenario === 'search') {
        // 模拟搜索工具调用
        const toolUseId = `tool-${Date.now()}`;
        controller.enqueue(sseEvent({
          type: 'tool_use_start',
          toolUseId,
          toolName: 'web_search',
        }));
        await delay(200);

        const query = message.replace(/搜|搜索|查|search/gi, '').trim() || message;
        controller.enqueue(sseEvent({
          type: 'tool_use_input',
          toolUseId,
          input: query,
        }));
        await delay(800);

        controller.enqueue(sseEvent({
          type: 'tool_result',
          toolUseId,
          status: 'success',
        }));
        await delay(200);

        // 流式输出文本
        const text = `根据搜索结果，以下是关于"${query}"的信息：\n\n这是一段模拟的搜索结果。在真实场景中，AI 会根据搜索引擎返回的内容进行总结和回答。\n\n**关键信息：**\n- 搜索到了相关结果\n- 数据来源可靠\n- 信息已更新至最新\n\n希望这些信息对你有帮助！`;
        for (const char of Array.from(text)) {
          assistantContent += char;
          controller.enqueue(sseEvent({ type: 'text_delta', content: char }));
          await delay(20);
        }

      } else if (scenario === 'code') {
        // 模拟代码执行工具调用 + Artifact
        const toolUseId = `tool-${Date.now()}`;
        controller.enqueue(sseEvent({
          type: 'tool_use_start',
          toolUseId,
          toolName: 'code_execution',
        }));
        await delay(200);

        controller.enqueue(sseEvent({
          type: 'tool_use_input',
          toolUseId,
          input: 'python script',
        }));
        await delay(1000);

        controller.enqueue(sseEvent({
          type: 'tool_result',
          toolUseId,
          status: 'success',
        }));
        await delay(200);

        // 创建代码 Artifact
        const artifactId = `artifact-${Date.now()}`;
        const codeContent = `def quicksort(arr):\n    """Quick sort implementation"""\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\n\n# 测试\ntest_arr = [3, 6, 8, 10, 1, 2, 1]\nresult = quicksort(test_arr)\nprint(f"排序结果: {result}")\n# 输出: 排序结果: [1, 1, 2, 3, 6, 8, 10]`;

        controller.enqueue(sseEvent({
          type: 'artifact_created',
          artifactId,
          artifactType: 'CODE',
          title: 'quicksort.py',
          language: 'python',
          content: codeContent,
          version: 1,
        }));
        await delay(200);

        // 文件创建工具
        const toolUseId2 = `tool-${Date.now() + 1}`;
        controller.enqueue(sseEvent({
          type: 'tool_use_start',
          toolUseId: toolUseId2,
          toolName: 'create_file',
        }));
        await delay(100);
        controller.enqueue(sseEvent({
          type: 'tool_use_input',
          toolUseId: toolUseId2,
          input: 'quicksort.py',
        }));
        await delay(500);
        controller.enqueue(sseEvent({
          type: 'tool_result',
          toolUseId: toolUseId2,
          status: 'success',
        }));
        await delay(200);

        // 流式输出文本
        const text = `我已经为你创建了 quicksort.py，包含了快速排序的完整实现。\n\n代码使用了列表推导式，非常简洁易读。你可以在右侧面板查看完整代码并下载。\n\n**功能说明：**\n- 基于分治思想实现\n- 选择中间元素作为 pivot\n- 时间复杂度 O(n log n)\n- 空间复杂度 O(n)`;
        for (const char of Array.from(text)) {
          assistantContent += char;
          controller.enqueue(sseEvent({ type: 'text_delta', content: char }));
          await delay(20);
        }

      } else if (scenario === 'image') {
        // 模拟代码执行生成图片
        const toolUseId = `tool-${Date.now()}`;
        controller.enqueue(sseEvent({
          type: 'tool_use_start',
          toolUseId,
          toolName: 'code_execution',
        }));
        await delay(200);

        controller.enqueue(sseEvent({
          type: 'tool_use_input',
          toolUseId,
          input: 'matplotlib chart',
        }));
        await delay(1200);

        controller.enqueue(sseEvent({
          type: 'tool_result',
          toolUseId,
          status: 'success',
        }));
        await delay(200);

        // 创建图片 Artifact（使用 placeholder）
        const artifactId = `artifact-${Date.now()}`;
        controller.enqueue(sseEvent({
          type: 'artifact_created',
          artifactId,
          artifactType: 'IMAGE',
          title: 'chart.png',
          url: 'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=Chart+Preview',
          version: 1,
        }));
        await delay(200);

        const text = `我已经生成了 chart.png 图表。你可以在右侧面板预览和下载。\n\n图表展示了数据的可视化结果，使用 matplotlib 绘制。`;
        for (const char of Array.from(text)) {
          assistantContent += char;
          controller.enqueue(sseEvent({ type: 'text_delta', content: char }));
          await delay(20);
        }

      } else {
        // 纯文本对话
        const mockResponse = `这是一段关于"${message}"的 Mock 流式回复。\n\n你可以看到打字机效果。这里是代码示例：\n\`\`\`javascript\nconsole.log("Hello, LiteFlow!");\n\`\`\`\n\n希望能帮到你！`;
        for (const char of Array.from(mockResponse)) {
          assistantContent += char;
          controller.enqueue(sseEvent({ type: 'text_delta', content: char }));
          await delay(30);
        }
      }

      // Save assistant message
      addMessage(convId, {
        id: assistantMessageId,
        conversationId: convId,
        role: 'assistant',
        content: assistantContent,
        createdAt: new Date().toISOString(),
      });

      if (isNew) {
        updateConversationTitle(convId, message.slice(0, 10));
      }

      // Send stream_end
      controller.enqueue(sseEvent({ type: 'stream_end' }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
