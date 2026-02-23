import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity,
    Dimensions, ScrollView,
} from 'react-native';
import Animated, {
    useAnimatedStyle, useSharedValue, withSpring, withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { QuizCardData } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
    card: QuizCardData;
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function QuizCard({ card }: Props) {
    const [selected, setSelected] = useState<string | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
    const shakeX = useSharedValue(0);

    const handleSelect = (optionId: string) => {
        if (answerState !== 'unanswered') return;
        setSelected(optionId);
        if (optionId === card.correctOptionId) {
            setAnswerState('correct');
        } else {
            setAnswerState('wrong');
            shakeX.value = withSequence(
                withSpring(-10, { damping: 3 }),
                withSpring(10, { damping: 3 }),
                withSpring(-6, { damping: 3 }),
                withSpring(6, { damping: 3 }),
                withSpring(0, { damping: 5 }),
            );
        }
    };

    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const getOptionStyle = (optionId: string) => {
        if (answerState === 'unanswered') {
            return selected === optionId ? styles.optionSelected : styles.option;
        }
        if (optionId === card.correctOptionId) return styles.optionCorrect;
        if (optionId === selected) return styles.optionWrong;
        return styles.optionDimmed;
    };

    const getOptionTextStyle = (optionId: string) => {
        if (answerState === 'unanswered') {
            return selected === optionId ? styles.optionTextSelected : styles.optionText;
        }
        if (optionId === card.correctOptionId) return styles.optionTextCorrect;
        if (optionId === selected) return styles.optionTextWrong;
        return styles.optionTextDimmed;
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8F7FA', '#EAE8FF', '#F8F7FA']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Badge */}
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>🧠  Quiz</Text>
                </View>

                {/* Question */}
                <Text style={styles.questionLabel}>Question</Text>
                <Text style={styles.question}>{card.question}</Text>

                {/* Options */}
                <Animated.View style={[styles.optionsContainer, shakeStyle]}>
                    {card.options.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={getOptionStyle(option.id)}
                            onPress={() => handleSelect(option.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.optionLetter}>
                                <Text style={styles.optionLetterText}>
                                    {option.id.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[getOptionTextStyle(option.id), styles.optionLabel]}>
                                {option.text}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>

                {/* Explanation */}
                {answerState !== 'unanswered' && (
                    <Animated.View
                        style={[
                            styles.explanationBox,
                            answerState === 'correct'
                                ? styles.explanationCorrect
                                : styles.explanationWrong,
                        ]}
                    >
                        <Text style={styles.explanationIcon}>
                            {answerState === 'correct' ? '✅' : '❌'}
                        </Text>
                        <Text style={styles.explanationTitle}>
                            {answerState === 'correct' ? 'Correct!' : 'Not quite'}
                        </Text>
                        <Text style={styles.explanationText}>{card.explanation}</Text>
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: SCREEN_W,
        height: SCREEN_H,
        backgroundColor: Colors.background,
        overflow: 'hidden',
    },
    scroll: {
        paddingHorizontal: Spacing['2xl'],
        paddingTop: 80,
        paddingBottom: 100,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.xl,
    },
    badgeText: {
        color: Colors.primary,
        fontSize: Typography.xs,
        fontWeight: Typography.weightSemibold,
        letterSpacing: 0.4,
    },
    questionLabel: {
        color: Colors.textTertiary,
        fontSize: Typography.xs,
        fontWeight: Typography.weightSemibold,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
    },
    question: {
        color: Colors.textPrimary,
        fontSize: Typography['2xl'],
        fontWeight: Typography.weightBold,
        lineHeight: 36,
        marginBottom: Spacing['2xl'],
        letterSpacing: -0.5,
    },
    optionsContainer: {
        gap: Spacing.md,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.base,
        borderWidth: 2,
        borderColor: Colors.border,
        ...Shadow.sm,
    },
    optionSelected: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.lg,
        padding: Spacing.base,
        borderWidth: 2,
        borderColor: Colors.primary,
        ...Shadow.sm,
    },
    optionCorrect: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successLight,
        borderRadius: Radius.lg,
        padding: Spacing.base,
        borderWidth: 2,
        borderColor: Colors.success,
        ...Shadow.sm,
    },
    optionWrong: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.errorLight,
        borderRadius: Radius.lg,
        padding: Spacing.base,
        borderWidth: 2,
        borderColor: Colors.error,
        ...Shadow.sm,
    },
    optionDimmed: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.borderLight,
        borderRadius: Radius.lg,
        padding: Spacing.base,
        borderWidth: 2,
        borderColor: Colors.borderLight,
        opacity: 0.5,
    },
    optionLetter: {
        width: 32,
        height: 32,
        borderRadius: Radius.full,
        backgroundColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    optionLetterText: {
        fontSize: Typography.sm,
        fontWeight: Typography.weightBold,
        color: Colors.textSecondary,
    },
    optionText: {
        flex: 1,
        fontSize: Typography.base,
        color: Colors.textPrimary,
        fontWeight: Typography.weightMedium,
        lineHeight: 22,
    },
    optionTextSelected: {
        flex: 1,
        fontSize: Typography.base,
        color: Colors.primary,
        fontWeight: Typography.weightSemibold,
        lineHeight: 22,
    },
    optionTextCorrect: {
        flex: 1,
        fontSize: Typography.base,
        color: Colors.success,
        fontWeight: Typography.weightSemibold,
        lineHeight: 22,
    },
    optionTextWrong: {
        flex: 1,
        fontSize: Typography.base,
        color: Colors.error,
        fontWeight: Typography.weightSemibold,
        lineHeight: 22,
    },
    optionTextDimmed: {
        flex: 1,
        fontSize: Typography.base,
        color: Colors.textTertiary,
        fontWeight: Typography.weightMedium,
        lineHeight: 22,
    },
    optionLabel: {},
    explanationBox: {
        marginTop: Spacing.xl,
        borderRadius: Radius.lg,
        padding: Spacing.base,
        alignItems: 'center',
    },
    explanationCorrect: {
        backgroundColor: Colors.successLight,
        borderWidth: 1,
        borderColor: Colors.success,
    },
    explanationWrong: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.error,
    },
    explanationIcon: {
        fontSize: 28,
        marginBottom: Spacing.sm,
    },
    explanationTitle: {
        fontSize: Typography.lg,
        fontWeight: Typography.weightBold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    explanationText: {
        fontSize: Typography.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
