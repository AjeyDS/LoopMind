import React from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView,
    SafeAreaView, Alert,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Topic } from '../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

interface Props extends DrawerContentComponentProps {
    topics: Topic[];
    activeTopic: Topic | null;
    onSelectTopic: (topic: Topic) => void;
    onAddTopic: () => void;
    onDeleteTopic?: (topicId: string) => void;
    onRetryTopic?: (topic: Topic) => void;
}

export default function Sidebar({
    topics,
    activeTopic,
    onSelectTopic,
    onAddTopic,
    onDeleteTopic,
    onRetryTopic,
    navigation,
}: Props) {
    const handleDelete = (topic: Topic) => {
        Alert.alert(
            `Delete "${topic.title}"?`,
            'This will remove all cards for this topic.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDeleteTopic?.(topic.id),
                },
            ]
        );
    };

    const handleMoreMenu = (topic: Topic) => {
        const options: any[] = [];

        if (topic.status === 'generating') {
            options.push({
                text: 'Retry Generation',
                onPress: () => onRetryTopic?.(topic),
            });
        }

        options.push(
            {
                text: 'Share',
                onPress: () => {
                    // Share functionality placeholder
                },
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDelete(topic),
            },
            { text: 'Cancel', style: 'cancel' },
        );

        Alert.alert(
            topic.title,
            topic.status === 'generating' ? 'This topic seems stuck. Try regenerating it.' : undefined,
            options,
        );
    };

    const depthColor: Record<string, string> = {
        beginner: Colors.success,
        intermediate: Colors.warning,
        advanced: Colors.error,
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <View style={styles.logoMark}>
                        <Text style={styles.logoIcon}>∞</Text>
                    </View>
                    <View>
                        <Text style={styles.appName}>Loopmind</Text>
                        <Text style={styles.appTagline}>Learn without limits</Text>
                    </View>
                </View>
            </View>

            {/* Topics */}
            <Text style={styles.sectionLabel}>Your Topics</Text>
            <ScrollView
                style={styles.topicList}
                showsVerticalScrollIndicator={false}
            >
                {topics.map((topic) => {
                    const isActive = activeTopic?.id === topic.id;
                    return (
                        <TouchableOpacity
                            key={topic.id}
                            style={[styles.topicRow, isActive && styles.topicRowActive]}
                            onPress={() => {
                                onSelectTopic(topic);
                                navigation.closeDrawer();
                            }}
                            activeOpacity={0.75}
                        >
                            {/* Emoji + info */}
                            <View style={[styles.topicEmoji, { backgroundColor: topic.color + '22' }]}>
                                <Text style={styles.emojiText}>{topic.emoji}</Text>
                            </View>
                            <View style={styles.topicInfo}>
                                <Text
                                    style={[styles.topicTitle, isActive && styles.topicTitleActive]}
                                    numberOfLines={1}
                                >
                                    {topic.title}
                                </Text>
                                <View style={styles.topicMeta}>
                                    <View style={[styles.dot, { backgroundColor: depthColor[topic.depth] }]} />
                                    <Text style={styles.topicDepth}>{topic.depth}</Text>
                                    {topic.status === 'generating' && topic.stuck && (
                                        <Text style={styles.stuckTag}>• Stuck — tap ⋮ to retry</Text>
                                    )}
                                    {topic.status === 'generating' && !topic.stuck && (
                                        <Text style={styles.generatingTag}>• Generating…</Text>
                                    )}
                                </View>
                            </View>
                            {/* Three-dot menu */}
                            <TouchableOpacity
                                style={styles.moreBtn}
                                onPress={() => handleMoreMenu(topic)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={styles.moreBtnText}>⋮</Text>
                            </TouchableOpacity>
                            {isActive && <View style={[styles.activeLine, { backgroundColor: topic.color }]} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Add topic FAB */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={onAddTopic}
                    activeOpacity={0.85}
                >
                    <Text style={styles.addButtonIcon}>+</Text>
                    <Text style={styles.addButtonText}>Add New Topic</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    logoMark: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.sm,
    },
    logoIcon: {
        fontSize: 24,
        color: Colors.textOnDark,
        fontWeight: Typography.weightExtrabold,
    },
    appName: {
        fontSize: Typography.lg,
        fontWeight: Typography.weightExtrabold,
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    appTagline: {
        fontSize: Typography.xs,
        color: Colors.textTertiary,
        fontWeight: Typography.weightMedium,
    },
    sectionLabel: {
        fontSize: Typography.xs,
        fontWeight: Typography.weightBold,
        color: Colors.textTertiary,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    topicList: {
        flex: 1,
        paddingHorizontal: Spacing.md,
    },
    topicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.lg,
        marginBottom: Spacing.xs,
        position: 'relative',
        overflow: 'hidden',
    },
    topicRowActive: {
        backgroundColor: Colors.primaryLight,
    },
    topicEmoji: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    emojiText: {
        fontSize: 20,
    },
    topicInfo: {
        flex: 1,
    },
    topicTitle: {
        fontSize: Typography.base,
        fontWeight: Typography.weightSemibold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    topicTitleActive: {
        color: Colors.primary,
    },
    topicMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    topicDepth: {
        fontSize: Typography.xs,
        color: Colors.textTertiary,
        fontWeight: Typography.weightMedium,
        textTransform: 'capitalize',
    },
    generatingTag: {
        fontSize: Typography.xs,
        color: Colors.primary,
        fontWeight: Typography.weightMedium,
    },
    stuckTag: {
        fontSize: Typography.xs,
        color: Colors.error,
        fontWeight: Typography.weightMedium,
    },
    countPill: {
        backgroundColor: Colors.border,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        marginLeft: Spacing.sm,
    },
    countPillActive: {
        backgroundColor: Colors.primary + '33',
    },
    countText: {
        fontSize: Typography.xs,
        fontWeight: Typography.weightBold,
        color: Colors.textTertiary,
    },
    countTextActive: {
        color: Colors.primary,
    },
    activeLine: {
        position: 'absolute',
        left: 0,
        top: 10,
        bottom: 10,
        width: 3,
        borderRadius: Radius.full,
    },
    footer: {
        padding: Spacing.xl,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.base,
        gap: Spacing.sm,
        ...Shadow.md,
    },
    addButtonIcon: {
        fontSize: Typography.xl,
        color: Colors.textOnDark,
        fontWeight: Typography.weightBold,
        lineHeight: 24,
    },
    addButtonText: {
        fontSize: Typography.base,
        fontWeight: Typography.weightBold,
        color: Colors.textOnDark,
    },
    moreBtn: {
        paddingHorizontal: 6,
        paddingVertical: 4,
        marginLeft: Spacing.xs,
        borderRadius: Radius.sm,
    },
    moreBtnText: {
        fontSize: 18,
        color: Colors.textTertiary,
        fontWeight: Typography.weightBold,
    },
});
