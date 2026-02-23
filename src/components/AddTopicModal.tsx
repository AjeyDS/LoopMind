import React, { useRef, useState } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, TextInput,
    Modal, KeyboardAvoidingView, Platform, Animated as RNAnimated,
    Dimensions, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Depth } from '../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
    visible: boolean;
    onClose: () => void;
    onGenerate: (title: string, depth: Depth) => void;
}

const DEPTHS: { label: string; value: Depth; emoji: string; desc: string }[] = [
    { label: 'Beginner', value: 'beginner', emoji: '🌱', desc: 'Concepts & fundamentals' },
    { label: 'Intermediate', value: 'intermediate', emoji: '⚡', desc: 'Deeper understanding' },
    { label: 'Advanced', value: 'advanced', emoji: '🔬', desc: 'Expert-level insights' },
];

export default function AddTopicModal({ visible, onClose, onGenerate }: Props) {
    const [title, setTitle] = useState('');
    const [depth, setDepth] = useState<Depth>('beginner');
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_H)).current;

    React.useEffect(() => {
        if (visible) {
            RNAnimated.spring(slideAnim, {
                toValue: 0,
                damping: 20,
                stiffness: 150,
                useNativeDriver: true,
            }).start();
        } else {
            RNAnimated.timing(slideAnim, {
                toValue: SCREEN_H,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleGenerate = () => {
        if (!title.trim()) return;
        onGenerate(title.trim(), depth);
        setTitle('');
        setDepth('beginner');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <RNAnimated.View
                style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {/* Handle */}
                    <View style={styles.handle} />

                    <Text style={styles.title}>New Topic</Text>
                    <Text style={styles.subtitle}>
                        Enter a topic and we'll generate a curated learning feed for you.
                    </Text>

                    {/* Topic name input */}
                    <Text style={styles.label}>Topic Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Quantum Computing, Roman History…"
                        placeholderTextColor={Colors.textTertiary}
                        value={title}
                        onChangeText={setTitle}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                    />

                    {/* Depth selector */}
                    <Text style={styles.label}>Learning Depth</Text>
                    <View style={styles.depthRow}>
                        {DEPTHS.map((d) => (
                            <TouchableOpacity
                                key={d.value}
                                style={[
                                    styles.depthCard,
                                    depth === d.value && styles.depthCardActive,
                                ]}
                                onPress={() => setDepth(d.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.depthEmoji}>{d.emoji}</Text>
                                <Text style={[
                                    styles.depthLabel,
                                    depth === d.value && styles.depthLabelActive,
                                ]}>{d.label}</Text>
                                <Text style={[
                                    styles.depthDesc,
                                    depth === d.value && styles.depthDescActive,
                                ]}>{d.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Generate button */}
                    <TouchableOpacity
                        style={[styles.generateBtn, !title.trim() && styles.generateBtnDisabled]}
                        onPress={handleGenerate}
                        activeOpacity={0.85}
                        disabled={!title.trim()}
                    >
                        <Text style={styles.generateBtnText}>✨  Generate Feed</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </RNAnimated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.overlay,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: Spacing['2xl'],
        paddingBottom: 48,
        ...Shadow.lg,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: Radius.full,
        alignSelf: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: Typography['2xl'],
        fontWeight: Typography.weightBold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: Typography.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: Spacing['2xl'],
    },
    label: {
        fontSize: Typography.xs,
        fontWeight: Typography.weightSemibold,
        color: Colors.textTertiary,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.background,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.md,
        fontSize: Typography.base,
        color: Colors.textPrimary,
        borderWidth: 2,
        borderColor: Colors.border,
        marginBottom: Spacing.xl,
    },
    depthRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing['2xl'],
    },
    depthCard: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    depthCardActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },
    depthEmoji: {
        fontSize: 22,
        marginBottom: Spacing.xs,
    },
    depthLabel: {
        fontSize: Typography.sm,
        fontWeight: Typography.weightBold,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    depthLabelActive: {
        color: Colors.primary,
    },
    depthDesc: {
        fontSize: 10,
        color: Colors.textTertiary,
        textAlign: 'center',
        lineHeight: 13,
    },
    depthDescActive: {
        color: Colors.primaryDark,
    },
    generateBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.base,
        alignItems: 'center',
        ...Shadow.md,
    },
    generateBtnDisabled: {
        backgroundColor: Colors.border,
    },
    generateBtnText: {
        color: Colors.textOnPrimary,
        fontSize: Typography.md,
        fontWeight: Typography.weightBold,
        letterSpacing: -0.2,
    },
});
