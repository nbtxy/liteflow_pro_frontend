import { addMessage } from '../../mockData';

export async function POST(request: Request) {
  const { conversationId } = await request.json();

  if (!conversationId) {
    return new Response(JSON.stringify({ message: 'Conversation ID is required' }), { status: 400 });
  }

  const assistantMessageId = `msg-${Date.now() + 1}`;

  // Mock a response based on user message
  const mockResponse = `这是一段重新生成的 Mock 流式回复。\n\n内容已经更新。\n\`\`\`javascript\nconsole.log("Regenerated!");\n\`\`\`\n\n希望能帮到你！`;

  let assistantContent = '';

  const stream = new ReadableStream({
    async start(controller) {
      // Send stream_start
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({
            type: 'stream_start',
            messageId: assistantMessageId,
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
      addMessage(conversationId, {
        id: assistantMessageId,
        conversationId: conversationId,
        role: 'assistant',
        content: assistantContent,
        createdAt: new Date().toISOString(),
      });

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
