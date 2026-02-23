import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle, useSharedValue, withTiming, withSpring,
    Easing,
} from 'react-native-reanimated';
import { Colors, Radius } from '../theme';

interface Props {
    /** 0 to 1 */
    progress: number;
    accentColor?: string;
}

export default function ProgressBar({ progress, accentColor = Colors.primary }: Props) {
    const width = useSharedValue(0);

    useEffect(() => {
        width.value = withSpring(Math.min(Math.max(progress, 0), 1), {
            damping: 18,
            stiffness: 120,
        });
    }, [progress]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${width.value * 100}%`,
    }));

    return (
        <View style={styles.track}>
            <Animated.View
                style={[styles.bar, barStyle, { backgroundColor: accentColor }]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: Radius.full,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: Radius.full,
    },
});
