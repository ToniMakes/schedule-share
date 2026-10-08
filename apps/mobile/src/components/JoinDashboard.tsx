import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { SavedRoom } from "../storage";
import { translate, type AppLanguage } from "../i18n";
import { SectionHeading, Surface } from "./ui";
import { palette } from "../theme";

export function JoinDashboard({
  language,
  rooms,
  shareInput,
  busy,
  onChangeShareInput,
  onOpenRoom
}: {
  language: AppLanguage;
  rooms: readonly SavedRoom[];
  shareInput: string;
  busy: boolean;
  onChangeShareInput: (value: string) => void;
  onOpenRoom: (value?: string) => void;
}) {
  return (
    <>
      <Surface style={styles.homeCard}>
        <SectionHeading language={language} label="joinSchedule" />
        <Text style={styles.cardDescription}>{translate(language, "joinDescription")}</Text>
        <TextInput
          style={styles.input}
          value={shareInput}
          onChangeText={onChangeShareInput}
          placeholder={translate(language, "sharePlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={translate(language, "shareAccessible")}
          returnKeyType="go"
          onSubmitEditing={() => onOpenRoom()}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => onOpenRoom()}
          style={({ pressed }) => [
            styles.primaryButton,
            busy && styles.disabled,
            pressed && styles.pressed
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{translate(language, "openSchedule")}</Text>
          )}
        </Pressable>
      </Surface>
      <View style={styles.roomsSection}>
        <SectionHeading language={language} label="mySchedules" detail={`${rooms.length}`} />
        <Text style={styles.cardDescription}>{translate(language, "mySchedulesDescription")}</Text>
        {rooms.length === 0 ? (
          <Surface style={styles.emptyRoomCard}>
            <Text style={styles.emptyTitle}>{translate(language, "emptySchedules")}</Text>
            <Text style={styles.emptyDescription}>{translate(language, "joinDescription")}</Text>
          </Surface>
        ) : (
          <FlatList
            data={rooms}
            scrollEnabled={false}
            keyExtractor={(item) => item.publicId}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.alias || item.title}, ${translate(language, "open")}`}
                style={({ pressed }) => [styles.roomRow, pressed && styles.pressed]}
                onPress={() => onOpenRoom(item.publicId)}
              >
                <View style={styles.roomText}>
                  <Text style={styles.roomTitle} numberOfLines={2}>
                    {item.alias || item.title}
                  </Text>
                  <Text style={styles.roomMeta}>
                    {translate(language, "roomCode")}: {item.publicId}
                  </Text>
                </View>
                <Text style={styles.link}>{translate(language, "open")}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  homeCard: { gap: 4 },
  cardDescription: {
    color: "#718198",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 14
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    marginBottom: 2,
    color: "#1b2f49",
    fontSize: 15
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
  roomsSection: { gap: 8 },
  emptyRoomCard: { gap: 7, backgroundColor: "#fbfcfe" },
  emptyTitle: { color: "#394f69", fontSize: 14, lineHeight: 20, fontWeight: "700" },
  emptyDescription: { color: "#718198", fontSize: 12, lineHeight: 18 },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e4eaf2",
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 9,
    minHeight: 76
  },
  roomText: { flex: 1, gap: 5, paddingRight: 10 },
  roomTitle: { color: palette.text, fontWeight: "700", fontSize: 15, lineHeight: 21 },
  roomMeta: { color: palette.subtle, fontSize: 11, lineHeight: 16 },
  link: { color: palette.accent, fontWeight: "700", fontSize: 13 }
});
