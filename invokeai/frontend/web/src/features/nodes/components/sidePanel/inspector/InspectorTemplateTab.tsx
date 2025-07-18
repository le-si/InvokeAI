import { useAppSelector } from 'app/store/storeHooks';
import { IAINoContentFallback } from 'common/components/IAIImageFallback';
import DataViewer from 'features/gallery/components/ImageMetadataViewer/DataViewer';
import { InvocationNodeContextProvider } from 'features/nodes/components/flow/nodes/Invocation/context';
import { TemplateGate } from 'features/nodes/components/sidePanel/inspector/NodeTemplateGate';
import { useNodeTemplateOrThrow } from 'features/nodes/hooks/useNodeTemplateOrThrow';
import { selectLastSelectedNodeId } from 'features/nodes/store/selectors';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const NodeTemplateInspector = () => {
  const lastSelectedNodeId = useAppSelector(selectLastSelectedNodeId);
  const { t } = useTranslation();

  if (!lastSelectedNodeId) {
    return <IAINoContentFallback label={t('nodes.noNodeSelected')} icon={null} />;
  }

  return (
    <InvocationNodeContextProvider nodeId={lastSelectedNodeId}>
      <TemplateGate
        nodeId={lastSelectedNodeId}
        fallback={<IAINoContentFallback label={t('nodes.noNodeSelected')} icon={null} />}
      >
        <Content nodeId={lastSelectedNodeId} />
      </TemplateGate>
    </InvocationNodeContextProvider>
  );
};

export default memo(NodeTemplateInspector);

const Content = memo((_: { nodeId: string }) => {
  const { t } = useTranslation();
  const template = useNodeTemplateOrThrow();

  return <DataViewer data={template} label={t('nodes.nodeTemplate')} bg="base.850" color="base.200" />;
});
Content.displayName = 'Content';
