import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet, View, Text, FlatList, Dimensions,
    TouchableOpacity, SafeAreaView, StatusBar, ListRenderItemInfo,
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Topic, Card } from '../types';
import { api } from '../services/api';
import CardRouter from '../components/cards/CardRouter';
import ProgressBar from '../components/ProgressBar';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
    topic: Topic | null;
    isGenerating: boolean;
    onAddTopic?: () => void;
}

export default function FeedScreen({ topic, isGenerating, onAddTopic }: Props) {
    const [cards, setCards] = useState<Card[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        if (!topic || isGenerating) return;
        setCurrentIndex(0);
        setLoading(true);
        api.getCards(topic.id).then((c) => {
            setCards(c);
            setLoading(false);
        });
    }, [topic?.id, isGenerating]);

    const progress = cards.length > 0 ? (currentIndex + 1) / cards.length : 0;

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: any[] }) => {
            if (viewableItems.length > 0) {
                setCurrentIndex(viewableItems[0].index ?? 0);
            }
        },
        []
    );

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<Card>) => <CardRouter card={item} />,
        []
    );

    const keyExtractor = useCallback((item: Card) => item.id, []);

    // ─── Empty / loading states ─────────────────────────────────────────
    if (!topic) {
        return (
            <View style={styles.emptyContainer}>
                {/* Hamburger so user can always reach the sidebar */}
                <SafeAreaView style={styles.topBarSafe}>
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.hamburger}
                            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <View style={styles.hamLine} />
                            <View style={[styles.hamLine, { width: 18 }]} />
                            <View style={styles.hamLine} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                <Text style={styles.emptyEmoji}>👈</Text>
                <Text style={styles.emptyTitle}>Pick a topic</Text>
                <Text style={styles.emptySubtitle}>
                    Create your first topic to start learning!
                </Text>
                <TouchableOpacity
                    style={styles.openSidebarBtn}
                    onPress={() => onAddTopic?.()}
                    activeOpacity={0.85}
                >
                    <Text style={styles.openSidebarBtnText}>+  Add New Topic</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Top bar */}
            <SafeAreaView style={styles.topBarSafe}>
                <View style={styles.topBar}>
                    {/* Hamburger */}
                    <TouchableOpacity
                        style={styles.hamburger}
                        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <View style={styles.hamLine} />
                        <View style={[styles.hamLine, { width: 18 }]} />
                        <View style={styles.hamLine} />
                    </TouchableOpacity>

                    {/* Topic info */}
                    <View style={styles.topicInfo}>
                        <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                        <Text style={styles.topicTitle} numberOfLines={1}>
                            {topic.title}
                        </Text>
                    </View>

                    {/* Card counter */}
                    <View style={styles.counter}>
                        <Text style={styles.counterText} numberOfLines={1}>
                            {cards.length > 0 ? `${currentIndex + 1}/${cards.length}` : '—'}
                        </Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressWrap}>
                    <ProgressBar progress={progress} accentColor={topic.color} />
                </View>
            </SafeAreaView>

            {/* Feed */}
            {loading ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>⏳</Text>
                    <Text style={styles.emptyTitle}>Loading cards…</Text>
                </View>
            ) : cards.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🃏</Text>
                    <Text style={styles.emptyTitle}>No cards yet</Text>
                    <Text style={styles.emptySubtitle}>
                        This topic is still empty.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={cards}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={SCREEN_H}
                    decelerationRate="fast"
                    snapToAlignment="start"
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig.current}
                    getItemLayout={(_data, index) => ({
                        length: SCREEN_H,
                        offset: SCREEN_H * index,
                        index,
                    })}
                    ListFooterComponent={
                        <View style={styles.endCard}>
                            <Text style={styles.endEmoji}>🎉</Text>
                            <Text style={styles.endTitle}>You've finished!</Text>
                            <Text style={styles.endSubtitle}>
                                You've reviewed all {cards.length} cards for{'\n'}
                                <Text style={[styles.endHighlight, { color: topic.color }]}>
                                    {topic.title}
                                </Text>
                            </Text>
                            <TouchableOpacity
                                style={[styles.endBtn, { backgroundColor: topic.color }]}
                                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                            >
                                <Text style={styles.endBtnText}>Explore another topic</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    topBarSafe: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.overlayLight,
    },
    hamburger: {
        gap: 4,
        padding: Spacing.sm,
    },
    hamLine: {
        height: 2,
        width: 22,
        backgroundColor: Colors.textPrimary,
        borderRadius: Radius.full,
    },
    topicInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginHorizontal: Spacing.sm,
    },
    topicEmoji: {
        fontSize: 18,
    },
    topicTitle: {
        fontSize: Typography.base,
        fontWeight: Typography.weightBold,
        color: Colors.textPrimary,
        flex: 1,
        letterSpacing: -0.3,
    },
    counter: {
        backgroundColor: Colors.border,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: 3,
    },
    counterText: {
        fontSize: Typography.xs,
        fontWeight: Typography.weightBold,
        color: Colors.textSecondary,
    },
    progressWrap: {
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.overlayLight,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['3xl'],
    },
    emptyEmoji: { fontSize: 52, marginBottom: Spacing.base },
    emptyTitle: {
        fontSize: Typography['2xl'],
        fontWeight: Typography.weightBold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: Typography.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    endCard: {
        height: SCREEN_H,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    endEmoji: { fontSize: 64, marginBottom: Spacing.xl },
    endTitle: {
        fontSize: Typography['3xl'],
        fontWeight: Typography.weightExtrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        letterSpacing: -0.8,
    },
    endSubtitle: {
        fontSize: Typography.lg,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: Spacing['3xl'],
    },
    endHighlight: {
        fontWeight: Typography.weightBold,
    },
    endBtn: {
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing.base,
        ...Shadow.md,
    },
    endBtnText: {
        color: Colors.textOnDark,
        fontSize: Typography.base,
        fontWeight: Typography.weightBold,
    },
    openSidebarBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing.base,
        marginTop: Spacing.xl,
        ...Shadow.md,
    },
    openSidebarBtnText: {
        color: Colors.textOnPrimary,
        fontSize: Typography.base,
        fontWeight: Typography.weightBold,
    },
});
