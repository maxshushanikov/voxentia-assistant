import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ChatInput from '../components/ChatInput';
import { I18nProvider } from '../i18n/context';

function renderChatInput(
  props: Partial<React.ComponentProps<typeof ChatInput>> & { language?: 'en' | 'de' | 'ru' },
) {
  const { language = 'en', ...rest } = props;
  return render(
    <I18nProvider language={language}>
      <ChatInput
        inputText=""
        setInputText={vi.fn()}
        onSend={vi.fn()}
        onMicClick={vi.fn()}
        onFileClick={vi.fn()}
        onNewChat={vi.fn()}
        isRecording={false}
        isThinking={false}
        {...rest}
      />
    </I18nProvider>,
  );
}

describe('ChatInput', () => {
  it('renders localized placeholder', () => {
    renderChatInput({ language: 'de' });
    expect(screen.getByPlaceholderText('Frag mich etwas...')).toBeInTheDocument();
  });

  it('calls onSend when Enter is pressed', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    renderChatInput({ inputText: 'Hallo', onSend, language: 'en' });

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalled();
  });
});
