import {
  ArrowLeftOutlined,
  RightOutlined,
  FileTextOutlined,
  CopyOutlined,
  DeleteOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Popconfirm, Skeleton, Tag, Tooltip, Typography, message } from 'antd';
import { history } from '@umijs/max';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { aiChatApi, authApi } from '@/services/api';

const { Paragraph } = Typography;

type ChatReference = {
  index: number;
  sceneTemplateId?: number;
  documentId?: string;
  knowledgeId?: number | string;
  chunkId?: string;
  title?: string;
  similarity?: number;
  contentPreview?: string;
};

type ChatMessage = {
  id: string | number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  references?: ChatReference[];
  modelName?: string;
  latencyMs?: number;
  createAt?: string;
  pending?: boolean;
};

type ChatSession = {
  id: number;
  title?: string;
  createAt?: string;
  updateAt?: string;
};

const suggestions = [
  '请帮我总结最重要的操作规范',
  '这项业务的办理流程和注意事项是什么？',
  '遇到常见异常时，通常应该怎么处理？',
];

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

// 兼容历史消息：旧回答可能仍带有 Markdown 标记，普通文本页面不应把这些符号直接展示出来。
function normalizeChatContent(value: unknown) {
  return String(value ?? '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\([*_#`>\[\]])/g, '$1')
    .replace(/^\s*```.*$/gm, '')
    .replace(/^\s*~~~.*$/gm, '')
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*(\d+)[.)]\s+/gm, '$1、')
    .replace(/!\[([^\]\n]*)\]\([^\)\n]+\)/g, '$1')
    .replace(/\[([^\]\n]+)\]\([^\)\n]+\)/g, '$1')
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1')
    .replace(/___([^_\n]+)___/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatChatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AiChat() {
  const currentUser = authApi.getCurrentUser();
  const operationPermissions = new Set(
    currentUser?.setting?.operationPermissions || currentUser?.operationPermissions || [],
  );
  const canReadHistory = Boolean(
    currentUser?.isBuiltin ||
      currentUser?.setting?.admin ||
      currentUser?.roleIds?.includes?.(1) ||
      operationPermissions.has('ai:chat:history'),
  );

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<number>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<number>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialQuestionRef = useRef(new URLSearchParams(history.location.search).get('q') || '');

  const activeSession = useMemo(
    () => sessions.find((item) => Number(item.id) === Number(sessionId)),
    [sessionId, sessions],
  );

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }, []);

  const loadSessions = useCallback(async (preserveSession = true) => {
    if (!canReadHistory) return;
    const rows = asArray<ChatSession>(await aiChatApi.sessions());
    setSessions(rows);
    if (!preserveSession && rows.length) setSessionId(Number(rows[0].id));
  }, [canReadHistory]);

  useEffect(() => {
    if (canReadHistory) loadSessions().catch(() => undefined);
  }, [canReadHistory, loadSessions]);

  useEffect(() => {
    if (!sessionId || !canReadHistory) return;
    setHistoryLoading(true);
    aiChatApi
      .messages(sessionId)
      .then((rows) => {
        setMessages(
          asArray<any>(rows).map((item) => ({
            id: item.id,
            role: String(item.role).toUpperCase() === 'USER' ? 'USER' : 'ASSISTANT',
            content: String(item.role).toUpperCase() === 'USER' ? item.content || '' : normalizeChatContent(item.content),
            references: asArray<ChatReference>(item.references),
            modelName: item.modelName,
            latencyMs: item.latencyMs,
            createAt: item.createAt,
          })),
        );
        scrollToBottom();
      })
      .finally(() => setHistoryLoading(false));
  }, [canReadHistory, scrollToBottom, sessionId]);

  useLayoutEffect(() => {
    if (!historyLoading) scrollToBottom();
  }, [historyLoading, messages, scrollToBottom, sessionId]);

  const handleDeleteSession = async (targetId: number) => {
    if (deletingSessionId != null) return;
    setDeletingSessionId(targetId);
    try {
      await aiChatApi.deleteSession(targetId);
      const nextSessions = sessions.filter((item) => Number(item.id) !== targetId);
      setSessions(nextSessions);
      if (Number(sessionId) === targetId) {
        const nextSessionId = nextSessions[0]?.id;
        setSessionId(nextSessionId == null ? undefined : Number(nextSessionId));
        if (nextSessionId == null) setMessages([]);
      }
      message.success('会话已删除');
    } finally {
      setDeletingSessionId(undefined);
    }
  };

  const startNewChat = () => {
    if (loading) return;
    setSessionId(undefined);
    setMessages([]);
    setQuestion('');
  };

  const submit = async (preset?: string) => {
    const value = String(preset ?? question).trim();
    if (!value || loading) return;
    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'USER',
      content: value,
      createAt: new Date().toISOString(),
    };
    const pendingId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: pendingId, role: 'ASSISTANT', content: '', pending: true },
    ]);
    setQuestion('');
    setLoading(true);
    try {
      const result = await aiChatApi.ask({
        sessionId,
        question: value,
      });
      setSessionId(Number(result.sessionId));
      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                id: result.messageId || pendingId,
                role: 'ASSISTANT',
                content: normalizeChatContent(result.answer),
                references: asArray<ChatReference>(result.references),
                modelName: result.modelName,
                latencyMs: result.latencyMs,
                createAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      if (canReadHistory) await loadSessions();
    } catch {
      setMessages((prev) => prev.filter((item) => item.id !== pendingId));
      setQuestion(value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialQuestion = initialQuestionRef.current.trim();
    if (!initialQuestion) return;
    initialQuestionRef.current = '';
    // Consume the landing-page query immediately. Otherwise returning from a
    // knowledge detail page can remount this route with the old `q` parameter
    // and submit the same question a second time.
    history.replace('/ai-chat/conversation');
    void submit(initialQuestion);
    // The landing-page question should be submitted only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReference = (reference: ChatReference) => {
    const inferredKnowledgeId = reference.knowledgeId || reference.title?.match(/knowledge-(\d+)(?:[-.]|$)/i)?.[1];
    if (!inferredKnowledgeId || !reference.sceneTemplateId) {
      message.info('该知识片段暂未关联可跳转的知识详情');
      return;
    }
    history.push({
      pathname: `/knowledge/scene/${reference.sceneTemplateId}/detail/${inferredKnowledgeId}`,
      state: { tabLabel: `知识详情 · ${reference.title || '知识片段'}` },
    });
  };
  const copyAnswer = async (content: string) => {
    await navigator.clipboard.writeText(content);
    message.success('回答已复制');
  };

  return (
    <PageHeader title="智能问答" breadcrumb="智能问答" hideHeader>
      <div className="ai-chat-workspace">
        <aside className="ai-chat-sidebar">
          <div className="ai-chat-sidebar-head">
            <div>
              <button type="button" className="ai-chat-back" onClick={() => history.push('/ai-chat')}>
                <ArrowLeftOutlined /> 返回智能问答首页
              </button>
              <div className="ai-chat-brand"><RobotOutlined /> 智能问答</div>
            </div>
            {canReadHistory ? (
              <Tooltip title="刷新会话">
                <Button type="text" icon={<ReloadOutlined />} onClick={() => loadSessions()} />
              </Tooltip>
            ) : null}
          </div>
          <Button block type="primary" icon={<PlusOutlined />} onClick={startNewChat}>
            新建会话
          </Button>

          <div className="ai-chat-session-label">
            <span>最近会话</span>
            {canReadHistory ? <span>{sessions.length}</span> : null}
          </div>
          <div className="ai-chat-session-list">
            {canReadHistory && sessions.length ? (
              sessions.map((item) => (
                <div
                  role="button"
                  tabIndex={0}
                  key={item.id}
                  className={`ai-chat-session-item ${Number(item.id) === Number(sessionId) ? 'is-active' : ''}`}
                  onClick={() => setSessionId(Number(item.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSessionId(Number(item.id));
                    }
                  }}
                >
                  <MessageOutlined />
                  <span>
                    <strong>{item.title || '新会话'}</strong>
                    <small>{formatChatTime(item.updateAt || item.createAt)}</small>
                  </span>
                  <span className="ai-chat-session-delete-anchor">
                    <Popconfirm
                      placement="rightTop"
                      overlayClassName="ai-chat-delete-popconfirm"
                      title={
                        <span className="ai-chat-delete-title">
                          <DeleteOutlined />
                          删除这个会话
                        </span>
                      }
                      description="删除后将无法恢复"
                      okText="确认删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void handleDeleteSession(Number(item.id))}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        className="ai-chat-session-delete"
                        loading={deletingSessionId === Number(item.id)}
                        icon={<DeleteOutlined />}
                        aria-label={`删除会话：${item.title || '新会话'}`}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      />
                    </Popconfirm>
                  </span>
                </div>
              ))
            ) : (
              <div className="ai-chat-session-empty">暂无历史会话</div>
            )}
          </div>
        </aside>

        <section className="ai-chat-main">
          <header className="ai-chat-toolbar">
            <div>
              <h1>{activeSession?.title || '新会话'}</h1>
            </div>
          </header>

          <div className="ai-chat-message-scroll" ref={scrollRef}>
            {historyLoading ? (
              <div className="ai-chat-loading"><Skeleton active paragraph={{ rows: 5 }} /></div>
            ) : messages.length ? (
              <div className="ai-chat-message-list">
                {messages.map((item) => (
                  <article key={item.id} className={`ai-chat-message is-${item.role.toLowerCase()}`}>
                    <Avatar
                      className="ai-chat-avatar"
                      icon={item.role === 'USER' ? <UserOutlined /> : <RobotOutlined />}
                    />
                    <div className="ai-chat-message-content">
                      <div className="ai-chat-message-meta">
                        <strong>{item.role === 'USER' ? '你' : '知识助手'}</strong>
                        {item.modelName ? <Tag bordered={false}>{item.modelName}</Tag> : null}
                        {item.latencyMs != null ? <span>{(Number(item.latencyMs) / 1000).toFixed(1)}s</span> : null}
                      </div>
                      {item.pending ? (
                        <div className="ai-chat-thinking"><i /><i /><i /><span>正在整理回答</span></div>
                      ) : (
                        <Paragraph className="ai-chat-answer">{item.content}</Paragraph>
                      )}
                      {!item.pending && item.role === 'ASSISTANT' ? (
                        <div className="ai-chat-answer-actions">
                          <Tooltip title="复制回答">
                            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyAnswer(item.content)} />
                          </Tooltip>
                        </div>
                      ) : null}
                      {item.references?.length ? (
                        <div className="ai-chat-references">
                          <div className="ai-chat-reference-title">相关资料 · {item.references.length} 条</div>
                          <div className="ai-chat-reference-strip">
                            {item.references.map((reference) => (
                              <button
                                type="button"
                                className="ai-chat-reference-thumb"
                                key={`${item.id}-${reference.index}-${reference.chunkId || ''}`}
                                onClick={() => openReference(reference)}
                                aria-label={`打开相关资料：${reference.title || '知识片段'}`}
                              >
                                <span className="ai-chat-reference-thumb-icon"><FileTextOutlined /></span>
                                <span className="ai-chat-reference-thumb-body">
                                  <strong>[{reference.index}] {reference.title || '知识片段'}</strong>
                                  <span>{reference.contentPreview || '暂无摘要'}</span>
                                </span>
                                <span className="ai-chat-reference-thumb-meta">
                                  {Number(reference.similarity) > 0 ? `${Math.round(Number(reference.similarity) * 100)}%` : ''}
                                  <RightOutlined />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ai-chat-welcome">
                <Typography.Title level={2}>今天想了解什么？</Typography.Title>
                <div className="ai-chat-suggestions">
                  {suggestions.map((item) => (
                    <button type="button" key={item} onClick={() => submit(item)}>
                      <span>{item}</span><SendOutlined />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="ai-chat-composer-wrap">
            <div className="ai-chat-composer">
              <textarea
                value={question}
                maxLength={2000}
                rows={3}
                placeholder="输入问题；Enter 发送，Shift + Enter 换行"
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
              />
              <div className="ai-chat-composer-actions">
                <span>{question.length}/2000</span>
                <Button
                  type="primary"
                  shape="circle"
                  size="large"
                  icon={<SendOutlined />}
                  loading={loading}
                  disabled={!question.trim()}
                  onClick={() => submit()}
                />
              </div>
            </div>
          </footer>
        </section>
      </div>
    </PageHeader>
  );
}









