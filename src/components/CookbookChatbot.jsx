import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { chatAboutSavedIngredients } from '../services/ai';

const DEFAULT_GREETING = {
  role: 'assistant',
  content: 'Ask me about ingredients from your saved cookbook recipes.',
};

const EMPTY_REPLY = 'Your cookbook does not have saved ingredients yet. Save a recipe first, then I can help search and compare its ingredients.';

function buildSavedRecipeContext(recipes) {
  return recipes.map(recipe => ({
    title: recipe.title,
    date: recipe.date,
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    nutrition: recipe.nutrition || {},
  }));
}

function getIngredientName(ingredient) {
  return ingredient
    .replace(/^[\d./\s]+(pcs|piece|pieces|kg|g|grams|lbs|lb|oz|l|ml|cups|cup|tbsp|tablespoons|tsp|teaspoons)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCookbookSuggestions(recipes) {
  const ingredientCounts = new Map();
  const newestRecipe = recipes.find(recipe => recipe.title && recipe.ingredients?.length > 0);

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients || []) {
      const name = getIngredientName(ingredient);
      if (!name) continue;

      const key = name.toLowerCase();
      const current = ingredientCounts.get(key) || { name, count: 0 };
      ingredientCounts.set(key, { ...current, count: current.count + 1 });
    }
  }

  const topIngredients = [...ingredientCounts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3);

  if (topIngredients.length === 0) {
    return ['What saved ingredients can you help me with?'];
  }

  const suggestions = [];

  if (topIngredients[0]) {
    suggestions.push(`Which saved recipes use ${topIngredients[0].name}?`);
  }

  if (topIngredients.length > 1) {
    suggestions.push(`What can I make with ${topIngredients.slice(0, 2).map(item => item.name).join(' and ')}?`);
  }

  if (newestRecipe?.title) {
    suggestions.push(`What ingredients are in ${newestRecipe.title}?`);
  } else {
    suggestions.push('What ingredients show up most often?');
  }

  return [...new Set(suggestions)].slice(0, 3);
}

function buildGreeting(recipes) {
  const recipeCount = recipes.length;
  const ingredientNames = recipes
    .flatMap(recipe => recipe.ingredients || [])
    .map(getIngredientName)
    .filter(Boolean);
  const uniqueIngredients = [...new Set(ingredientNames.map(name => name.toLowerCase()))];
  const firstRecipeWithIngredients = recipes.find(recipe => recipe.title && recipe.ingredients?.length > 0);

  if (recipeCount === 0) {
    return DEFAULT_GREETING.content;
  }

  if (uniqueIngredients.length === 0) {
    return `I found ${recipeCount} saved recipe${recipeCount === 1 ? '' : 's'}, but no saved ingredients yet.`;
  }

  const previewIngredients = uniqueIngredients.slice(0, 3).join(', ');
  const recipeHint = firstRecipeWithIngredients?.title ? ` from ${firstRecipeWithIngredients.title}` : '';
  return `I found ${uniqueIngredients.length} saved ingredient${uniqueIngredients.length === 1 ? '' : 's'}${recipeHint}, including ${previewIngredients}.`;
}

export default function CookbookChatbot({ recipes = [], loading = false }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([DEFAULT_GREETING]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const messagesEndRef = useRef(null);

  const savedRecipeContext = useMemo(() => buildSavedRecipeContext(recipes), [recipes]);
  const cookbookSuggestions = useMemo(() => buildCookbookSuggestions(recipes), [recipes]);
  const cookbookGreeting = useMemo(() => buildGreeting(recipes), [recipes]);
  const suggestions = aiSuggestions ?? cookbookSuggestions;
  const hasSavedIngredients = savedRecipeContext.some(recipe => recipe.ingredients.length > 0);
  const canSend = input.trim() && !sending && !loading;

  useEffect(() => {
    setAiSuggestions(null);
    setMessages(prev => {
      const hasConversation = prev.some(message => message.role === 'user');
      if (hasConversation) return prev;
      return [{ role: 'assistant', content: cookbookGreeting }];
    });
  }, [cookbookGreeting]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open, sending]);

  const sendMessage = async (questionOverride) => {
    const question = (questionOverride ?? input).trim();
    if (!question || sending || loading) return;

    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError('');
    setSending(true);

    if (!hasSavedIngredients) {
      setMessages(prev => [...prev, { role: 'assistant', content: EMPTY_REPLY }]);
      setSending(false);
      return;
    }

    try {
      const history = messages
        .filter(message => message.role === 'user' || message.role === 'assistant')
        .slice(-8);
      const response = await chatAboutSavedIngredients(question, savedRecipeContext, history);
      const reply = typeof response?.reply === 'string' && response.reply.trim()
        ? response.reply.trim()
        : 'I could not find a clear answer in your saved cookbook ingredients.';

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (Array.isArray(response?.suggestedQuestions) && response.suggestedQuestions.length > 0) {
        const nextSuggestions = response.suggestedQuestions
          .filter(item => typeof item === 'string' && item.trim())
          .slice(0, 3);
        setAiSuggestions(nextSuggestions.length > 0 ? nextSuggestions : null);
      }
    } catch (chatError) {
      const message = chatError instanceof Error ? chatError.message : 'AI service error. Please try again.';
      setError(message);
      setMessages(prev => [...prev, { role: 'assistant', content: 'I could not reach the cookbook AI just now. Please try again.' }]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className={`cookbook-chatbot${open ? ' open' : ''}`}>
      {open && (
        <section className="cookbook-chat-panel" aria-label="Cookbook AI chatbot">
          <header className="cookbook-chat-header">
            <div className="cookbook-chat-title">
              <span className="cookbook-chat-avatar">
                <Bot size={20} />
              </span>
              <div>
                <h3>Cookbook AI</h3>
                <p>{loading ? 'Loading saved recipes' : `${recipes.length} saved recipe${recipes.length === 1 ? '' : 's'}`}</p>
              </div>
            </div>
            <button type="button" className="cookbook-chat-close" onClick={() => setOpen(false)} title="Close chat">
              <X size={18} />
            </button>
          </header>

          <div className="cookbook-chat-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`cookbook-chat-message ${message.role}`}>
                {message.content}
              </div>
            ))}
            {sending && (
              <div className="cookbook-chat-message assistant cookbook-chat-thinking">
                <Sparkles size={15} /> Thinking
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <div className="cookbook-chat-error">{error}</div>}

          {suggestions.length > 0 && (
            <div className="cookbook-chat-suggestions">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  disabled={sending || loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form className="cookbook-chat-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about saved ingredients"
              disabled={sending || loading}
              aria-label="Ask about saved ingredients"
            />
            <button type="submit" disabled={!canSend} title="Send message">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="cookbook-chat-fab"
        onClick={() => setOpen(prev => !prev)}
        aria-label={open ? 'Collapse cookbook AI chat' : 'Open cookbook AI chat'}
        title={open ? 'Collapse chat' : 'Ask Cookbook AI'}
      >
        {open ? <ChevronDown size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
