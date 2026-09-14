import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { AgentWorkspace } from '@/components/agent-workspace';
import './style.css';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await requireChatGPTUser('/agent');
  return <AgentWorkspace displayName={user.displayName} />;
}
