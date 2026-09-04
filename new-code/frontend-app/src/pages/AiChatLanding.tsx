import {
  ArrowRightOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { authApi } from '@/services/api';

const starterQuestions = [
  '帮我梳理当前业务的标准办理流程',
  '最近更新的制度和注意事项有哪些？',
  '遇到常见异常时应该如何处理？',
];


export default function AiChatLanding() {
  const [question, setQuestion] = useState('');
  const currentUser = authApi.getCurrentUser();
  const displayName = currentUser?.userNickname || currentUser?.userAccount || '您好';
  useEffect(() => {
    const body = document.body;
    const landing = document.querySelector<HTMLElement>('.ai-landing');
    body.classList.add('ai-landing-page');

    if (!landing) {
      return () => body.classList.remove('ai-landing-page');
    }

    let frame = 0;
    const resetPointer = () => {
      landing.style.setProperty('--ai-pointer-x', '50%');
      landing.style.setProperty('--ai-pointer-y', '42%');
      landing.style.setProperty('--ai-grid-shift-x', '0px');
      landing.style.setProperty('--ai-grid-shift-y', '0px');
      landing.style.setProperty('--ai-grid-tilt-x', '0deg');
      landing.style.setProperty('--ai-grid-tilt-y', '0deg');
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = landing.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        landing.style.setProperty('--ai-pointer-x', `${x * 100}%`);
        landing.style.setProperty('--ai-pointer-y', `${y * 100}%`);
        landing.style.setProperty('--ai-grid-shift-x', `${(x - 0.5) * 24}px`);
        landing.style.setProperty('--ai-grid-shift-y', `${(y - 0.5) * 18}px`);
        landing.style.setProperty('--ai-grid-tilt-x', `${(x - 0.5) * 2.6}deg`);
        landing.style.setProperty('--ai-grid-tilt-y', `${(0.5 - y) * 2.2}deg`);
        frame = 0;
      });
    };

    resetPointer();
    landing.addEventListener('pointermove', handlePointerMove, { passive: true });
    landing.addEventListener('pointerleave', resetPointer, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      landing.removeEventListener('pointermove', handlePointerMove);
      landing.removeEventListener('pointerleave', resetPointer);
      body.classList.remove('ai-landing-page');
    };
  }, []);
  const enterChat = (preset?: string) => {
    const value = String(preset ?? question).trim();
    history.push(value ? `/ai-chat/conversation?q=${encodeURIComponent(value)}` : '/ai-chat/conversation');
  };

  return (
    <PageHeader title="智能问答" breadcrumb="智能问答" hideHeader className="ai-landing-shell">
      <main className="ai-landing">
        <section className="ai-landing-hero">
          <div className="ai-landing-grid" aria-hidden="true" />
          <div className="ai-landing-glow ai-landing-glow-left" aria-hidden="true" />
          <div className="ai-landing-glow ai-landing-glow-right" aria-hidden="true" />

          <div className="ai-landing-content">
            <div className="ai-landing-copy">
              <div className="ai-landing-kicker">
                <span><ThunderboltOutlined /></span>
                ENTERPRISE KNOWLEDGE COPILOT
              </div>
              <p className="ai-landing-greeting">{displayName}，欢迎使用企业知识助手</p>
              <h1>让企业知识，<br />成为随时可用的答案</h1>
              <p className="ai-landing-summary">
                快速检索、归纳与回答，让关键结论清晰可追溯，经验真正沉淀并流动起来。
              </p>

              <div className="ai-landing-composer">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={question}
                  aria-label="输入想要咨询的问题"
                  placeholder="输入你想了解的问题，例如：CMMM 评估计划如何报备？"
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      enterChat();
                    }
                  }}
                />
                <div className="ai-landing-composer-footer">
                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    onClick={() => enterChat()}
                  >
                    {question.trim() ? '发送并开始' : '进入问答'}
                  </Button>
                </div>
              </div>

              <div className="ai-landing-starters" aria-label="推荐问题">
                <span>试着问我</span>
                {starterQuestions.map((item) => (
                  <button type="button" key={item} onClick={() => enterChat(item)}>
                    {item}<ArrowRightOutlined />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>
    </PageHeader>
  );
}



