import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated as RNAnimated } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

interface Props {
    topicTitle: string;
}

export default function GeneratingOverlay({ topicTitle }: Props) {
    const pulse = useRef(new RNAnimated.Value(1)).current;
    const rotate = useRef(new RNAnimated.Value(0)).current;
    const dot0 = useRef(new RNAnimated.Value(0)).current;
    const dot1 = useRef(new RNAnimated.Value(0)).current;
    const dot2 = useRef(new RNAnimated.Value(0)).current;
    const dots = [dot0, dot1, dot2];

    useEffect(() => {
        // Pulsing glow ring
        RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
                RNAnimated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();

        // Spin icon
        RNAnimated.loop(
            RNAnimated.timing(rotate, { toValue: 1, duration: 2000, useNativeDriver: true })
        ).start();

        // Bouncing dots with staggered delay
        dots.forEach((dot, i) => {
            RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.delay(i * 160),
                    RNAnimated.timing(dot, { toValue: -8, duration: 340, useNativeDriver: true }),
                    RNAnimated.timing(dot, { toValue: 0, duration: 340, useNativeDriver: true }),
                ])
            ).start();
        });
    }, []);

    const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <View style={styles.container}>
            {/* Pulsing blob */}
            <View style={styles.blobOuter}>
                <RNAnimated.View style={[styles.blobInner, { transform: [{ scale: pulse }] }]}>
                    <View style={styles.iconCircle}>
                        <RNAnimated.Text style={[styles.icon, { transform: [{ rotate: spin }] }]}>
                            ⚙️
                        </RNAnimated.Text>
                    </View>
                </RNAnimated.View>
            </View>

            <Text style={styles.title}>Generating</Text>
            <Text style={styles.topicName}>"{topicTitle}"</Text>
            <Text style={styles.subtitle}>
                Curating cards, questions, and flashcards{'\n'}tailored to your depth preference.
            </Text>

            {/* Bouncing dots */}
            <View style={styles.dotsRow}>
                {dots.map((dot, i) => (
                    <RNAnimated.View
                        key={i}
                        style={[styles.dot, { transform: [{ translateY: dot }] }]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    blobOuter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing['2xl'],
    },
    blobInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: Colors.primary + '33',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 32,
    },
    title: {
        fontSize: Typography['3xl'],
        fontWeight: Typography.weightExtrabold,
        color: Colors.textPrimary,
        letterSpacing: -0.8,
        marginBottom: Spacing.xs,
    },
    topicName: {
        fontSize: Typography.xl,
        fontWeight: Typography.weightSemibold,
        color: Colors.primary,
        marginBottom: Spacing.base,
    },
    subtitle: {
        fontSize: Typography.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing['3xl'],
    },
    dotsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
});
