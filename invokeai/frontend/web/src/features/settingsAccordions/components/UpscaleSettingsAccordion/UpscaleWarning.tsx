import { Button, Flex, ListItem, Text, UnorderedList } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectModel } from 'features/controlLayers/store/paramsSlice';
import { setInstallModelsTabByName } from 'features/modelManagerV2/store/installModelsStore';
import { useIsTooLargeToUpscale } from 'features/parameters/hooks/useIsTooLargeToUpscale';
import {
  selectTileControlNetModel,
  selectUpscaleInitialImage,
  selectUpscaleModel,
  tileControlnetModelChanged,
} from 'features/parameters/store/upscaleSlice';
import { selectIsModelsTabDisabled, selectMaxUpscaleDimension } from 'features/system/store/configSlice';
import { navigationApi } from 'features/ui/layouts/navigation-api';
import { useCallback, useEffect, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useControlNetModels } from 'services/api/hooks/modelsByType';

export const UpscaleWarning = () => {
  const { t } = useTranslation();
  const model = useAppSelector(selectModel);
  const upscaleModel = useAppSelector(selectUpscaleModel);
  const tileControlnetModel = useAppSelector(selectTileControlNetModel);
  const upscaleInitialImage = useAppSelector(selectUpscaleInitialImage);
  const dispatch = useAppDispatch();
  const [modelConfigs, { isLoading }] = useControlNetModels();
  const isModelsTabDisabled = useAppSelector(selectIsModelsTabDisabled);
  const maxUpscaleDimension = useAppSelector(selectMaxUpscaleDimension);
  const isTooLargeToUpscale = useIsTooLargeToUpscale(upscaleInitialImage);

  useEffect(() => {
    const validModel = modelConfigs.find((cnetModel) => {
      return cnetModel.base === model?.base && cnetModel.name.toLowerCase().includes('tile');
    });
    if (tileControlnetModel?.key !== validModel?.key) {
      dispatch(tileControlnetModelChanged(validModel || null));
    }
  }, [dispatch, model?.base, modelConfigs, tileControlnetModel?.key]);

  const isBaseModelCompatible = useMemo(() => {
    return model && ['sd-1', 'sdxl'].includes(model.base);
  }, [model]);

  const modelWarnings = useMemo(() => {
    const _warnings: string[] = [];
    if (!isBaseModelCompatible) {
      return _warnings;
    }
    if (!model) {
      _warnings.push(t('upscaling.mainModelDesc'));
    }
    if (!tileControlnetModel) {
      _warnings.push(t('upscaling.tileControlNetModelDesc'));
    }
    if (!upscaleModel) {
      _warnings.push(t('upscaling.upscaleModelDesc'));
    }
    return _warnings;
  }, [isBaseModelCompatible, model, tileControlnetModel, upscaleModel, t]);

  const otherWarnings = useMemo(() => {
    const _warnings: string[] = [];
    if (isTooLargeToUpscale && maxUpscaleDimension) {
      _warnings.push(
        t('upscaling.exceedsMaxSizeDetails', { maxUpscaleDimension: maxUpscaleDimension.toLocaleString() })
      );
    }
    return _warnings;
  }, [isTooLargeToUpscale, t, maxUpscaleDimension]);

  const allWarnings = useMemo(() => [...modelWarnings, ...otherWarnings], [modelWarnings, otherWarnings]);

  const handleGoToModelManager = useCallback(() => {
    navigationApi.switchToTab('models');
    setInstallModelsTabByName('launchpad');
  }, []);

  if (isBaseModelCompatible && modelWarnings.length > 0 && isModelsTabDisabled) {
    return null;
  }

  if ((isBaseModelCompatible && allWarnings.length === 0) || isLoading) {
    return null;
  }

  return (
    <Flex bg="error.500" borderRadius="base" padding={4} direction="column" fontSize="sm" gap={2}>
      {!isBaseModelCompatible && <Text>{t('upscaling.incompatibleBaseModelDesc')}</Text>}
      {modelWarnings.length > 0 && (
        <Text>
          <Trans
            i18nKey="upscaling.missingModelsWarning"
            components={{
              LinkComponent: (
                <Button size="sm" flexGrow={0} variant="link" color="base.50" onClick={handleGoToModelManager} />
              ),
            }}
          />
        </Text>
      )}
      {allWarnings.length > 0 && (
        <UnorderedList>
          {allWarnings.map((warning) => (
            <ListItem key={warning}>{warning}</ListItem>
          ))}
        </UnorderedList>
      )}
    </Flex>
  );
};
