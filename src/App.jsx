import ApiKeyModal from './ApiKeyModal';
import AvatarPanel from './AvatarPanel';
import ChatPanel from './ChatPanel';
import Composer from './Composer';
import Header from './Header';
import SettingsPanel from './SettingsPanel';
import { useLexi } from './useLexi';

function App() {
  const lexi = useLexi();

  return (
    <>
      <ApiKeyModal
        show={lexi.showModal}
        endpoint={lexi.ollamaEndpoint}
        model={lexi.ollamaModel}
        isConnecting={lexi.isConnecting}
        error={lexi.connectError}
        onConnect={lexi.connectOllama}
        onSkip={lexi.skipConnection}
      />

      <SettingsPanel
        show={lexi.showSettings}
        endpoint={lexi.ollamaEndpoint}
        model={lexi.ollamaModel}
        feedback={lexi.settingsFeedback}
        onSave={lexi.saveSettings}
      />

      <Header
        modeOptions={lexi.ui.modeOptions}
        currentMode={lexi.currentMode}
        onModeChange={lexi.onModeChange}
        statusText={lexi.statusText}
        onOpenSettings={() => lexi.setShowSettings(prev => !prev)}
      />

      <main className="main">
        <AvatarPanel isSpeaking={lexi.isSpeaking} />

        <section className="chat-panel">
          <ChatPanel
            topicBadge={lexi.topicBadge}
            msgCount={lexi.msgCount}
            messages={lexi.messages}
            isThinking={lexi.isThinking}
          />

          <Composer
            quickPrompts={lexi.ui.quickPrompts}
            inputValue={lexi.inputValue}
            isLoading={lexi.isLoading}
            isListening={lexi.isListening}
            voiceSupported={lexi.voiceSupported}
            canInterrupt={lexi.canInterrupt}
            setInputValue={lexi.setInputValue}
            onQuickPrompt={lexi.sendQuickPrompt}
            onUpload={lexi.handleFileUpload}
            onFlashcards={lexi.generateFlashcards}
            onQuiz={lexi.generateQuiz}
            onToggleVoice={lexi.toggleVoice}
            onInterrupt={lexi.interrupt}
            onSend={() => lexi.sendMessage()}
          />
        </section>
      </main>
    </>
  );
}

export default App;
