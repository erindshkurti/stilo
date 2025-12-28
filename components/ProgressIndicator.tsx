import { Text, View } from 'react-native';

interface ProgressIndicatorProps {
    currentStep: number;
    totalSteps: number;
    steps: string[];
}

export function ProgressIndicator({ currentStep, totalSteps, steps }: ProgressIndicatorProps) {
    return (
        <View className="mb-8">
            {/* Progress Bar */}
            <View className="h-2 bg-neutral-100 rounded-full mb-6">
                <View
                    className="h-2 bg-black rounded-full"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
            </View>

            {/* Step Labels */}
            <View className="flex-row justify-between">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;

                    return (
                        <View key={index} className="items-center flex-1">
                            <View
                                className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${isCompleted ? 'bg-black' : isActive ? 'bg-black' : 'bg-neutral-200'
                                    }`}
                            >
                                <Text className={`text-sm font-semibold ${isCompleted || isActive ? 'text-white' : 'text-neutral-500'
                                    }`}>
                                    {stepNumber}
                                </Text>
                            </View>
                            <Text className={`text-xs text-center ${isActive ? 'text-black font-semibold' : 'text-neutral-500'
                                }`}>
                                {step}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
