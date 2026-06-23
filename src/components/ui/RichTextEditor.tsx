import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ScrollView,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius } from '@/constants/spacing';

interface Props {
  /** HTML inicial (montado UMA vez — o editor passa a ser a fonte da verdade). */
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const MIN_H = 140;
const MAX_H = 460;
const DEFAULT_H = 190;

function buildHtml(
  initial: string,
  placeholder: string,
  textColor: string,
  bgColor: string,
  placeholderColor: string,
): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  html,body{margin:0;padding:0;background:${bgColor};}
  #editor{min-height:100vh;padding:12px;font-size:16px;line-height:1.5;color:${textColor};
    background:${bgColor};outline:none;box-sizing:border-box;
    font-family:-apple-system,BlinkMacSystemFont,Roboto,'Segoe UI',sans-serif;
    word-wrap:break-word;-webkit-user-select:text;}
  #editor:empty:before{content:attr(data-ph);color:${placeholderColor};}
  #editor ul,#editor ol{padding-left:22px;margin:6px 0;}
  #editor p{margin:0 0 8px 0;}
</style></head><body>
<div id="editor" contenteditable="true" data-ph="${placeholder.replace(/"/g, '&quot;')}">${initial}</div>
<script>
  var e=document.getElementById('editor');
  function post(t,p){window.ReactNativeWebView.postMessage(JSON.stringify({type:t,payload:p}));}
  function change(){post('change',e.innerHTML);}
  e.addEventListener('input',change);
  function exec(cmd,val){e.focus();document.execCommand(cmd,false,val);change();}
  window.__exec=exec;
  post('ready','');
</script></body></html>`;
}

export function RichTextEditor({ initialHtml, onChange, placeholder = 'Adicione uma descrição...' }: Props) {
  const { theme } = useTheme();
  const webRef = useRef<WebView>(null);
  const [height, setHeight] = useState(DEFAULT_H);
  const baseH = useRef(DEFAULT_H);

  // Monta o HTML UMA vez — re-montar resetaria o cursor. A chave (key) no pai
  // (por task.id) garante recarregar ao abrir outra tarefa.
  const html = useMemo(
    () =>
      buildHtml(
        initialHtml || '',
        placeholder,
        theme.colors.text,
        theme.colors.surface,
        theme.colors.textTertiary,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const exec = useCallback((cmd: string, val?: string) => {
    const arg = val ? `'${val}'` : 'null';
    webRef.current?.injectJavaScript(`window.__exec && window.__exec('${cmd}', ${arg}); true;`);
  }, []);

  const onMessage = useCallback(
    (ev: WebViewMessageEvent) => {
      try {
        const d = JSON.parse(ev.nativeEvent.data);
        if (d.type === 'change') onChange(d.payload as string);
      } catch {
        // ignore
      }
    },
    [onChange],
  );

  const clamp = (h: number) => Math.max(MIN_H, Math.min(MAX_H, h));
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) =>
        setHeight(clamp(baseH.current + g.dy)),
      onPanResponderRelease: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        baseH.current = clamp(baseH.current + g.dy);
      },
    }),
  ).current;

  const Btn = ({ label, cmd, val, bold, italic }: { label: string; cmd: string; val?: string; bold?: boolean; italic?: boolean }) => (
    <TouchableOpacity
      style={[styles.btn, { borderColor: theme.colors.border }]}
      onPress={() => exec(cmd, val)}
      hitSlop={4}
    >
      <Text
        style={[
          styles.btnText,
          { color: theme.colors.text },
          bold && { fontWeight: '800' },
          italic && { fontStyle: 'italic' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.toolbar, { borderBottomColor: theme.colors.border }]}
        contentContainerStyle={styles.toolbarContent}
        keyboardShouldPersistTaps="always"
      >
        <Btn label="B" cmd="bold" bold />
        <Btn label="I" cmd="italic" italic />
        <Btn label="U" cmd="underline" />
        <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
        <Btn label="•—" cmd="insertUnorderedList" />
        <Btn label="1.—" cmd="insertOrderedList" />
        <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
        <Btn label="⇤" cmd="justifyLeft" />
        <Btn label="↔" cmd="justifyCenter" />
        <Btn label="⇥" cmd="justifyRight" />
        <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
        <Btn label="⤺" cmd="removeFormat" />
      </ScrollView>

      <WebView
        ref={webRef}
        source={{ html }}
        onMessage={onMessage}
        style={[styles.web, { height }]}
        originWhitelist={['*']}
        scrollEnabled
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator
      />

      <View {...pan.panHandlers} style={styles.handle} hitSlop={{ top: 8, bottom: 8 }}>
        <View style={[styles.grip, { backgroundColor: theme.colors.textTertiary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  toolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
  },
  toolbarContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1.5],
    gap: Spacing[1],
  },
  btn: {
    minWidth: 34,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 15 },
  sep: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: 2 },
  web: { backgroundColor: 'transparent' },
  handle: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: { width: 40, height: 4, borderRadius: 2, opacity: 0.5 },
});
