import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';

import { Topic, Depth } from './src/types';
import { api } from './src/services/api';
import Sidebar from './src/components/Sidebar';
import FeedScreen from './src/screens/FeedScreen';
import AddTopicModal from './src/components/AddTopicModal';
import GeneratingOverlay from './src/components/GeneratingOverlay';

const Drawer = createDrawerNavigator();

export default function App() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);

    // ─── Load topics from backend on mount ──────────────────────────────
    useEffect(() => {
        api.getTopics()
            .then((fetched) => {
                setTopics(fetched);
                if (fetched.length > 0) {
                    setActiveTopic(fetched[0]);
                }
            })
            .catch(() => {
                console.warn('[App] Failed to load topics');
            });
    }, []);

    const handleSelectTopic = useCallback((topic: Topic) => {
        setActiveTopic(topic);
    }, []);

    const handleAddTopic = useCallback(() => {
        setShowAddModal(true);
    }, []);

    // ─── Generate a new topic via the real backend ─────────────────────
    const handleGenerate = useCallback(async (title: string, _depth: Depth) => {
        // Fire-and-forget — don't await. The backend runs in the background.
        const nodeId = `node-${Date.now()}`;
        api.generateTopic(title, '', nodeId).catch(() => { }); // intentionally not awaited

        // Create a placeholder topic immediately
        const placeholderTopic: Topic = {
            id: nodeId,
            title,
            emoji: '🧠',
            color: '#6C63FF',
            status: 'generating',
            depth: _depth,
            cardCount: 0,
            cards: [],
        };

        setTopics((prev) => [placeholderTopic, ...prev]);
        setActiveTopic(placeholderTopic);
        setGeneratingTopicId(nodeId);

        // Poll the backend until the topic is ready (max 5 minutes)
        const startTime = Date.now();
        const MAX_POLL_MS = 5 * 60 * 1000; // 5 minutes
        let attempt = 0;

        const poll = async () => {
            const elapsed = Date.now() - startTime;

            // Safety: stop after max time and just refresh
            if (elapsed > MAX_POLL_MS) {
                console.log('[poll] Max time reached. Refreshing topics.');
                const refreshed = await api.getTopics();
                setTopics(refreshed);
                const found = refreshed.find((t) => t.id === nodeId);
                if (found) setActiveTopic(found);
                setGeneratingTopicId(null);
                return;
            }

            attempt++;
            console.log(`[poll] attempt ${attempt}, elapsed ${Math.round(elapsed / 1000)}s`);

            const status = await api.pollTopicStatus(nodeId);
            if (status === 'ready') {
                console.log(`[poll] Topic ready after ${Math.round(elapsed / 1000)}s`);
                const refreshed = await api.getTopics();
                setTopics(refreshed);
                const readyTopic = refreshed.find((t) => t.id === nodeId);
                if (readyTopic) setActiveTopic(readyTopic);
                setGeneratingTopicId(null);
            } else {
                // Poll every 4s for the first 2 min, then every 8s after
                const interval = elapsed < 120_000 ? 4000 : 8000;
                setTimeout(poll, interval);
            }
        };
        setTimeout(poll, 3000); // first poll after 3s
    }, []);

    // ─── Retry a stuck generating topic ────────────────────────────────
    const handleRetryTopic = useCallback(async (topic: Topic) => {
        // Delete the stuck topic first, then regenerate
        await api.deleteTopic(topic.id);
        setTopics((prev) => prev.filter((t) => t.id !== topic.id));

        // Re-trigger generation with a new node ID
        const nodeId = `node-${Date.now()}`;
        api.generateTopic(topic.title, '', nodeId).catch(() => { });

        const placeholderTopic: Topic = {
            id: nodeId,
            title: topic.title,
            emoji: '🧠',
            color: topic.color,
            status: 'generating',
            depth: topic.depth,
            cardCount: 0,
            cards: [],
        };

        setTopics((prev) => [placeholderTopic, ...prev]);
        setActiveTopic(placeholderTopic);
        setGeneratingTopicId(nodeId);

        // Poll until ready
        const startTime = Date.now();
        const MAX_POLL_MS = 5 * 60 * 1000;
        let attempt = 0;

        const poll = async () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > MAX_POLL_MS) {
                const refreshed = await api.getTopics();
                setTopics(refreshed);
                const found = refreshed.find((t) => t.id === nodeId);
                if (found) setActiveTopic(found);
                setGeneratingTopicId(null);
                return;
            }
            attempt++;
            console.log(`[retry-poll] attempt ${attempt}, elapsed ${Math.round(elapsed / 1000)}s`);
            const status = await api.pollTopicStatus(nodeId);
            if (status === 'ready') {
                const refreshed = await api.getTopics();
                setTopics(refreshed);
                const readyTopic = refreshed.find((t) => t.id === nodeId);
                if (readyTopic) setActiveTopic(readyTopic);
                setGeneratingTopicId(null);
            } else {
                const interval = elapsed < 120_000 ? 4000 : 8000;
                setTimeout(poll, interval);
            }
        };
        setTimeout(poll, 3000);
    }, []);

    const handleDeleteTopic = useCallback(async (topicId: string) => {
        await api.deleteTopic(topicId);
        setTopics((prev) => {
            const updated = prev.filter((t) => t.id !== topicId);
            if (activeTopic?.id === topicId) {
                setActiveTopic(updated[0] ?? null);
            }
            return updated;
        });
    }, [activeTopic]);

    const renderDrawerContent = useCallback(
        (props: DrawerContentComponentProps) => (
            <Sidebar
                {...props}
                topics={topics}
                activeTopic={activeTopic}
                onSelectTopic={handleSelectTopic}
                onAddTopic={handleAddTopic}
                onDeleteTopic={handleDeleteTopic}
                onRetryTopic={handleRetryTopic}
            />
        ),
        [topics, activeTopic, handleSelectTopic, handleAddTopic, handleDeleteTopic, handleRetryTopic]
    );

    const isGenerating = !!(generatingTopicId && activeTopic?.id === generatingTopicId);

    return (
        <GestureHandlerRootView style={styles.root}>
            <StatusBar style="dark" />
            <NavigationContainer>
                <Drawer.Navigator
                    drawerContent={renderDrawerContent}
                    screenOptions={{
                        headerShown: false,
                        drawerStyle: { width: 300 },
                        swipeEdgeWidth: 60,
                    }}
                >
                    <Drawer.Screen name="Feed">
                        {() => (
                            <View style={{ flex: 1 }}>
                                <FeedScreen topic={activeTopic} isGenerating={isGenerating} onAddTopic={handleAddTopic} />
                                {isGenerating && generatingTopicId && (
                                    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
                                        <GeneratingOverlay
                                            topicTitle={topics.find((t) => t.id === generatingTopicId)?.title ?? ''}
                                        />
                                    </View>
                                )}
                            </View>
                        )}
                    </Drawer.Screen>
                </Drawer.Navigator>
            </NavigationContainer>

            <AddTopicModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onGenerate={handleGenerate}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
