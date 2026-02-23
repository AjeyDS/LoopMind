import React, { useState, useCallback, useEffect } from 'react';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Topic, Depth } from '../src/types';
import { api } from '../src/services/api';
import Sidebar from '../src/components/Sidebar';
import FeedScreen from '../src/screens/FeedScreen';
import AddTopicModal from '../src/components/AddTopicModal';
import GeneratingOverlay from '../src/components/GeneratingOverlay';

const Drawer = createDrawerNavigator();

export default function RootLayout() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);

    // ─── Load topics from backend on mount ──────────────────────────────
    useEffect(() => {
        api.getTopics().then((fetched) => {
            setTopics(fetched);
            if (fetched.length > 0) {
                setActiveTopic(fetched[0]);
            }
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
        setGeneratingTopic(nodeId);

        // Poll the backend until the topic is ready (max 3 minutes)
        const startTime = Date.now();
        const MAX_POLL_MS = 3 * 60 * 1000;

        const poll = async () => {
            if (Date.now() - startTime > MAX_POLL_MS) {
                console.log('[poll] Max time reached. Refreshing topics.');
                const refreshed = await api.getTopics();
                setTopics(refreshed);
                const found = refreshed.find((t) => t.id === nodeId);
                if (found) setActiveTopic(found);
                setGeneratingTopic(null);
                return;
            }

            const status = await api.pollTopicStatus(nodeId);
            if (status === 'ready') {
                const refreshed = await api.getTopics();
                setTopics(refreshed);
                const readyTopic = refreshed.find((t) => t.id === nodeId);
                if (readyTopic) setActiveTopic(readyTopic);
                setGeneratingTopic(null);
            } else {
                setTimeout(poll, 5000);
            }
        };
        setTimeout(poll, 5000);
    }, []);

    const renderDrawerContent = useCallback(
        (props: DrawerContentComponentProps) => (
            <Sidebar
                {...props}
                topics={topics}
                activeTopic={activeTopic}
                onSelectTopic={handleSelectTopic}
                onAddTopic={handleAddTopic}
            />
        ),
        [topics, activeTopic, handleSelectTopic, handleAddTopic]
    );

    const isGenerating = !!(
        generatingTopic && activeTopic?.id === generatingTopic
    );

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
                        {() =>
                            isGenerating && generatingTopic ? (
                                <GeneratingOverlay
                                    topicTitle={
                                        topics.find((t) => t.id === generatingTopic)?.title ?? ''
                                    }
                                />
                            ) : (
                                <FeedScreen
                                    topic={activeTopic}
                                    isGenerating={isGenerating}
                                    onAddTopic={handleAddTopic}
                                />
                            )
                        }
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
