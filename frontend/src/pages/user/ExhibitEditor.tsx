import { useNavigate, useParams } from 'react-router-dom'
import React, { useEffect, useState, useRef } from 'react'
import TextEditor, { TextEditorHandle } from '@components/TextEditor.tsx'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { useUnsavedChangesWarning } from '@hooks/useUnsavedChangesWarning.tsx'
import Confirm from '@components/Confirm.tsx'
import ExhibitAttributeEditor from '@components/ExhibitAttributeEditor.tsx'
import ImageUploader from '@components/ImageUploader.tsx'
import { showMessage } from '@components/MessageModalUtil.tsx'
import Button from '@components/Button.tsx'
import ActionBar from '@components/ActionBar.tsx'
import PageHeading from '@components/PageHeading.tsx'
import {
  FormSection,
  FormFieldGroup,
  FormLabel,
  SectionLabel,
  Input,
  Checkbox,
} from '@components/Form.tsx'
import { useForm, SubmitHandler } from 'react-hook-form'
import LoadInProgress from '@components/LoadInProgress'
import Icon from '@components/Icon'

const WELL_KNOWN_SERVICES = ['ftp', 'http', 'https', 'ssh', 'telnet'] as const
type WellKnownService = (typeof WELL_KNOWN_SERVICES)[number]

type Attribute = {
  name: string
  value: string
}

type ExhibitFormData = {
  title: string
  table?: number
  touchMe: boolean
  description: string
  descriptionExtension: string
  attributes: Attribute[]
  mainImage: number | null
  hostName: string
  hostServices: WellKnownService[]
}

const GET_DATA = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      touchMe
      description
      descriptionExtension
      table {
        number
      }
      attributes {
        name
        value
      }
      mainImage
      exhibitor {
        id
        tables {
          number
        }
      }
      host {
        name
        ipAddress
        services
      }
    }
  }
`)

const GET_EXHIBIT_HOST = graphql(`
  query GetExhibitHost($id: Int!) {
    getExhibit(id: $id) {
      id
      host {
        name
        ipAddress
        services
      }
    }
  }
`)

const UPDATE_EXHIBIT = graphql(`
  mutation UpdateExhibit(
    $id: Int!
    $title: String
    $touchMe: Boolean
    $description: String
    $descriptionExtension: String
    $table: Int
    $attributes: [AttributeInput!]
  ) {
    updateExhibit(
      id: $id
      title: $title
      touchMe: $touchMe
      description: $description
      descriptionExtension: $descriptionExtension
      table: $table
      attributes: $attributes
    ) {
      id
      title
      touchMe
      description
      descriptionExtension
      table {
        number
      }
      attributes {
        name
        value
      }
      mainImage
      host {
        name
        ipAddress
        services
      }
    }
  }
`)

const CREATE_EXHIBIT = graphql(`
  mutation CreateExhibit(
    $title: String!
    $touchMe: Boolean
    $description: String
    $descriptionExtension: String
    $table: Int
    $attributes: [AttributeInput!]
  ) {
    createExhibit(
      title: $title
      touchMe: $touchMe
      description: $description
      descriptionExtension: $descriptionExtension
      table: $table
      attributes: $attributes
    ) {
      id
      title
      touchMe
      description
      descriptionExtension
      table {
        number
      }
      attributes {
        name
        value
      }
      mainImage
      host {
        name
        ipAddress
        services
      }
    }
  }
`)

const GET_MY_TABLES = graphql(`
  query GetMyTables {
    getCurrentExhibitor {
      tables {
        number
      }
    }
  }
`)

const DELETE_EXHIBIT = graphql(`
  mutation DeleteExhibit($id: Int!) {
    deleteExhibit(id: $id)
  }
`)

const ADD_HOST = graphql(`
  mutation AddHost($name: String!, $input: HostInput!) {
    addHost(name: $name, input: $input) {
      name
      ipAddress
      services
    }
  }
`)

const DELETE_HOST = graphql(`
  mutation DeleteHost($name: String!) {
    deleteHost(name: $name)
  }
`)

const UPDATE_HOST_SERVICES = graphql(`
  mutation UpdateHostServices($name: String!, $services: [WellKnownService!]!) {
    updateHostServices(name: $name, services: $services) {
      name
      ipAddress
      services
    }
  }
`)

const ExhibitEditor = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const apolloClient = useApolloClient()
  const isNew = id === 'new'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteHostConfirm, setShowDeleteHostConfirm] = useState(false)
  const descriptionEditorRef = useRef<TextEditorHandle>(null)
  const descriptionExtensionEditorRef = useRef<TextEditorHandle>(null)

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
    setValue,
    watch,
    reset,
  } = useForm<ExhibitFormData>({
    mode: 'onBlur',
    defaultValues: {
      title: '',
      touchMe: false,
      table: undefined,
      description: '',
      descriptionExtension: '',
      attributes: [],
      mainImage: null,
      hostName: '',
      hostServices: [],
    },
  })

  const {
    data: exhibitData,
    loading: exhibitLoading,
    error: exhibitError,
  } = useQuery(GET_DATA, {
    variables: { id: Number(id) },
    skip: isNew,
  })

  const { data: hostData, refetch: refetchHost } = useQuery(GET_EXHIBIT_HOST, {
    variables: { id: Number(id) },
    skip: isNew,
  })

  const { data: tablesData } = useQuery(GET_MY_TABLES, {
    skip: !isNew,
  })

  const [updateExhibit] = useMutation(UPDATE_EXHIBIT)
  const [createExhibit] = useMutation(CREATE_EXHIBIT)
  const [deleteExhibit] = useMutation(DELETE_EXHIBIT)
  const [addHost] = useMutation(ADD_HOST, {
    onCompleted: () => {
      setValue('hostName', '')
      void refetchHost()
    },
    update: (cache) => {
      // Invalidate the GET_HOSTS query to force a refetch
      cache.evict({ fieldName: 'getCurrentExhibition' })
    },
  })
  const [deleteHost] = useMutation(DELETE_HOST, {
    onCompleted: () => {
      void refetchHost()
    },
  })
  const [updateHostServices] = useMutation(UPDATE_HOST_SERVICES, {
    onCompleted: () => {
      void refetchHost()
    },
  })

  useEffect(() => {
    if (exhibitData?.getExhibit) {
      const { title, touchMe, table, description, descriptionExtension, attributes, mainImage } =
        exhibitData.getExhibit
      reset({
        title: title || '',
        touchMe: Boolean(touchMe),
        table: table?.number || undefined,
        description: description || '',
        descriptionExtension: descriptionExtension || '',
        attributes: attributes || [],
        mainImage: mainImage as number | null,
        hostName: exhibitData.getExhibit.host?.name || '',
        hostServices: exhibitData.getExhibit.host?.services || [],
      })
      setDetailName(location.pathname, title || '')
    } else if (isNew) {
      reset({
        title: '',
        touchMe: false,
        table: undefined,
        description: '',
        descriptionExtension: '',
        attributes: [],
        mainImage: null,
        hostName: '',
        hostServices: [],
      })
      setDetailName(location.pathname, 'Neues Exponat')
    }
  }, [
    exhibitData?.getExhibit?.title,
    exhibitData?.getExhibit?.touchMe,
    exhibitData?.getExhibit?.table,
    exhibitData?.getExhibit?.description,
    exhibitData?.getExhibit?.descriptionExtension,
    exhibitData?.getExhibit?.attributes,
    exhibitData?.getExhibit?.mainImage,
    setDetailName,
    isNew,
    reset,
  ])

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setValue('table', e.target.value ? Number(e.target.value) : undefined, { shouldDirty: true })

  const handleAttributesChange = (newAttributes: Attribute[]) => {
    setValue('attributes', newAttributes, { shouldDirty: true })
  }

  const handleMainImageChange = (newImageId: number | null) => {
    setValue('mainImage', newImageId, { shouldDirty: true })
    apolloClient.refetchQueries({
      include: [GET_DATA],
    })
  }

  useUnsavedChangesWarning(isDirty)

  const onSubmit: SubmitHandler<ExhibitFormData> = async (data) => {
    if (!data.title.trim()) {
      await showMessage('Fehlende Angabe', 'Bitte gib einen Titel für das Exponat ein')
      return
    }

    const currentDescription = descriptionEditorRef.current?.getHTML() || ''
    const currentDescriptionExtension = descriptionExtensionEditorRef.current?.getHTML() || ''
    const validAttributes = data.attributes
      .filter((attr) => attr.name && attr.value)
      .map(({ name, value }) => ({ name, value }))

    await apolloClient.resetStore()
    const variables = {
      title: data.title,
      touchMe: data.touchMe,
      description: currentDescription,
      descriptionExtension: currentDescriptionExtension,
      table: data.table || null,
      attributes: validAttributes.length > 0 ? validAttributes : undefined,
    }
    if (isNew) {
      const result = await createExhibit({ variables })
      if (result.errors) {
        await showMessage('Fehler', 'Fehler beim Erstellen des Exponats')
        return
      }
      navigate(`/exhibit/${result.data?.createExhibit!.id}`)
    } else {
      const result = await updateExhibit({ variables: { id: Number(id), ...variables } })
      if (result.errors) {
        await showMessage('Fehler', 'Fehler beim Aktualisieren des Exponats')
        return
      }
      navigate(`/exhibit/${id}`)
    }
  }

  const handleDelete = async () => {
    await deleteExhibit({ variables: { id: Number(id) } })
    await apolloClient.clearStore()
    navigate('/user/exhibit')
  }

  const handleAddHost = async () => {
    const result = await addHost({
      variables: {
        name: watch('hostName'),
        input: {
          exhibitId: Number(id),
          services: [],
        },
      },
    })

    if (result.errors) {
      const errorMessage = result.errors[0]?.message || 'Fehler beim Anlegen des Hosts'
      await showMessage('Fehler', errorMessage, 'OK')
      return
    }
  }

  const handleDeleteHost = async (name: string) => {
    await deleteHost({
      variables: { name },
      update: (cache) => {
        // Invalidate the GET_HOSTS query to force a refetch
        cache.evict({ fieldName: 'getCurrentExhibition' })
      },
    })
  }

  const handleServiceChange = async (service: WellKnownService, checked: boolean) => {
    const host = hostData?.getExhibit?.host
    if (!host || !host.services) return

    const newServices = checked
      ? [...host.services, service]
      : host.services.filter((s) => s !== service)

    await updateHostServices({
      variables: {
        name: host.name,
        services: newServices,
      },
      update: (cache) => {
        // Invalidate the GET_HOSTS query to force a refetch
        cache.evict({ fieldName: 'getCurrentExhibition' })
      },
    })
  }

  if (!isNew) {
    if (exhibitLoading) {
      return <LoadInProgress />
    }

    if (exhibitError) {
      return <p>Fehler beim Laden des Exponats: {exhibitError.message}</p>
    }

    if (!exhibitData?.getExhibit) {
      return <p>Exponat nicht gefunden</p>
    }
  }

  const tables =
    (isNew
      ? tablesData?.getCurrentExhibitor?.tables?.map((table) => table.number)
      : exhibitData?.getExhibit?.exhibitor?.tables?.map((table) => table.number)) || []

  return (
    <>
      <article className="space-y-6">
        <header>
          <PageHeading>{isNew ? 'Neues Exponat' : 'Exponat bearbeiten'}</PageHeading>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection>
            <SectionLabel>Exponat-Details</SectionLabel>
            <FormFieldGroup>
              <FormLabel>Titel</FormLabel>
              <Input
                type="text"
                {...register('title', { required: true })}
                error={errors.title?.message}
              />
              <FormLabel>Bespielbar</FormLabel>
              <Checkbox label="Besucher dürfen das Exponat bespielen" {...register('touchMe')} />

              {!isNew && tables.length > 0 && (
                <>
                  <FormLabel>Tisch</FormLabel>
                  <select
                    value={watch('table') || ''}
                    onChange={handleTableChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:bg-gray-700 dark:focus:ring-blue-400">
                    <option value="">Kein Tisch zugewiesen</option>
                    {tables.map((number) => (
                      <option key={number} value={number}>
                        Tisch {number}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </FormFieldGroup>
          </FormSection>

          <div className="flex flex-col gap-6 md:flex-row">
            {!isNew && (
              <FormSection className="md:w-[40%]">
                <SectionLabel>Hauptbild</SectionLabel>
                <ImageUploader
                  imageId={watch('mainImage')}
                  imageUrl={`/api/exhibit/${id}/image/main`}
                  onImageChange={handleMainImageChange}
                  title=""
                  alt="Hauptbild"
                />
              </FormSection>
            )}

            <FormSection className="md:w-[60%]">
              <SectionLabel>Datenblatt</SectionLabel>
              <ExhibitAttributeEditor
                attributes={watch('attributes')}
                onChange={handleAttributesChange}
              />
            </FormSection>
          </div>

          <FormSection>
            <SectionLabel>Beschreibung</SectionLabel>
            <TextEditor
              ref={descriptionEditorRef}
              defaultValue={watch('description')}
              onEditStateChange={(edited) => {
                if (edited) {
                  setValue('description', descriptionEditorRef.current?.getHTML() || '', {
                    shouldDirty: true,
                  })
                }
              }}
            />
            <br />
            <SectionLabel>Erweiterte Beschreibung (nur im Web)</SectionLabel>
            <TextEditor
              ref={descriptionExtensionEditorRef}
              defaultValue={watch('descriptionExtension')}
              onEditStateChange={(edited) => {
                if (edited) {
                  setValue(
                    'descriptionExtension',
                    descriptionExtensionEditorRef.current?.getHTML() || '',
                    {
                      shouldDirty: true,
                    },
                  )
                }
              }}
            />
          </FormSection>

          {!isNew && (
            <FormSection>
              <SectionLabel>LAN</SectionLabel>
              <FormFieldGroup>
                {hostData?.getExhibit?.host ? (
                  <>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                      <div className="w-[200px]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setShowDeleteHostConfirm(true)
                            }}
                            className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                            title="Hostnamen löschen">
                            <Icon name="x" color="white" className="h-4 w-4" />
                          </button>
                          <div className="flex-1">
                            <FormLabel>Hostname</FormLabel>
                            <div className="mt-1 text-gray-900 dark:text-gray-100">
                              {hostData.getExhibit.host.name}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="w-[200px]">
                        <FormLabel>IP-Adresse</FormLabel>
                        <div className="mt-1 text-gray-900 dark:text-gray-100">
                          {hostData.getExhibit.host.ipAddress}
                        </div>
                      </div>
                      <div
                        className="w-[300px]"
                        title="Änderungen an den Diensten werden sofort übernommen">
                        <FormLabel>Dienste</FormLabel>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {WELL_KNOWN_SERVICES.map((service) => (
                            <label key={service} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={
                                  hostData.getExhibit?.host?.services?.includes(service) ?? false
                                }
                                onChange={(e) => handleServiceChange(service, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{service}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        if (watch('hostName').trim()) {
                          void handleAddHost()
                        }
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={watch('hostName')}
                        onChange={(e) => setValue('hostName', e.target.value)}
                        placeholder="hostname"
                        className="flex-grow"
                      />
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (watch('hostName').trim()) {
                            void handleAddHost()
                          }
                        }}
                        disabled={!watch('hostName').trim()}>
                        Anlegen
                      </Button>
                    </div>
                  </div>
                )}
              </FormFieldGroup>
            </FormSection>
          )}

          <ActionBar>
            <Button type="submit" disabled={!isDirty || !watch('title').trim()}>
              {isNew ? 'Erstellen' : 'Speichern'}
            </Button>
            {!isNew && (
              <Button type="button" onClick={() => setShowDeleteConfirm(true)} variant="danger">
                Löschen
              </Button>
            )}
          </ActionBar>
        </form>
      </article>

      <Confirm
        isOpen={showDeleteConfirm}
        title="Exponat löschen"
        message={`Möchtest Du das Exponat "${watch('title')}" wirklich löschen?`}
        confirm="Löschen"
        cancel="Abbrechen"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />

      <Confirm
        isOpen={showDeleteHostConfirm}
        title="Host löschen"
        message={`Möchtest Du den Hostnamen "${hostData?.getExhibit?.host?.name}" löschen und die IP-Adresse freigeben?`}
        confirm="Löschen"
        cancel="Abbrechen"
        onConfirm={() => {
          if (hostData?.getExhibit?.host) {
            void handleDeleteHost(hostData.getExhibit.host.name)
          }
          setShowDeleteHostConfirm(false)
        }}
        onClose={() => setShowDeleteHostConfirm(false)}
      />
    </>
  )
}

export default ExhibitEditor
