import { addConversation, addMessage, updateConversationTitle } from '../../mockData';

export async function POST(request: Request) {
  const { conversationId, message } = await request.json();

  let convId = conversationId;
  const isNew = !convId;

  if (isNew) {
    convId = `conv-${Date.now()}`;
    addConversation({
      id: convId,
      title: '新对话', // Will be updated later
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

  // Mock a response based on user message
  const mockResponse = `这是一段关于“${message}”的 Mock 流式回复。\n\n你可以看到打字机效果。这里是代码示例：\n\`\`\`javascript\nconsole.log("Hello, LiteFlow!");\n\`\`\`\n\n希望能帮到你！`;

  let assistantContent = '';

  const stream = new ReadableStream({
    async start(controller) {
      // Send stream_start
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({
            type: 'stream_start',
            messageId: assistantMessageId,
            conversationId: isNew ? convId : undefined,
          })}\n\n`
        )
      );

      // Stream text_delta
      const chars = Array.from(mockResponse);
      for (const char of chars) {
        await new Promise((resolve) => setTimeout(resolve, 30)); // 30ms per char
        assistantContent += char;
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: 'text_delta',
              content: char,
            })}\n\n`
          )
        );
      }

      // Save assistant message
      addMessage(convId, {
        id: assistantMessageId,
        conversationId: convId,
        role: 'assistant',
        content: assistantContent,
        createdAt: new Date().toISOString(),
      });

      // Update title if new
      if (isNew) {
        updateConversationTitle(convId, message.slice(0, 10));
      }

      // Send stream_end
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({
            type: 'stream_end',
          })}\n\n`
        )
      );

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
