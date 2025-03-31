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
import { FormSection, FormFieldGroup, FormLabel, SectionLabel, Input } from '@components/Form.tsx'
import { useForm, SubmitHandler } from 'react-hook-form'
import { generateAndDownloadPDF } from '@components/ExhibitPDF.tsx'
import LoadInProgress from '@components/LoadInProgress'

type Attribute = {
  name: string
  value: string
}

type ExhibitFormData = {
  title: string
  table?: number
  description: string
  descriptionExtension: string
  attributes: Attribute[]
  mainImage: number | null
}

const GET_DATA = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
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
    }
  }
`)

const UPDATE_EXHIBIT = graphql(`
  mutation UpdateExhibit(
    $id: Int!
    $title: String
    $description: String
    $descriptionExtension: String
    $table: Int
    $attributes: [AttributeInput!]
  ) {
    updateExhibit(
      id: $id
      title: $title
      description: $description
      descriptionExtension: $descriptionExtension
      table: $table
      attributes: $attributes
    ) {
      id
      title
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
    }
  }
`)

const CREATE_EXHIBIT = graphql(`
  mutation CreateExhibit(
    $title: String!
    $description: String
    $descriptionExtension: String
    $table: Int
    $attributes: [AttributeInput!]
  ) {
    createExhibit(
      title: $title
      description: $description
      descriptionExtension: $descriptionExtension
      table: $table
      attributes: $attributes
    ) {
      id
      title
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

const ExhibitEditor = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const apolloClient = useApolloClient()
  const isNew = id === 'new'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
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
      table: undefined,
      description: '',
      descriptionExtension: '',
      attributes: [],
      mainImage: null,
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

  const { data: tablesData } = useQuery(GET_MY_TABLES, {
    skip: !isNew,
  })

  const [updateExhibit] = useMutation(UPDATE_EXHIBIT)
  const [createExhibit] = useMutation(CREATE_EXHIBIT)
  const [deleteExhibit] = useMutation(DELETE_EXHIBIT)

  useEffect(() => {
    if (exhibitData?.getExhibit) {
      const { title, table, description, descriptionExtension, attributes, mainImage } =
        exhibitData.getExhibit
      reset({
        title: title || '',
        table: table?.number || undefined,
        description: description || '',
        descriptionExtension: descriptionExtension || '',
        attributes: attributes || [],
        mainImage: mainImage as number | null,
      })
      setDetailName(location.pathname, title || '')
    } else if (isNew) {
      reset({
        title: '',
        table: undefined,
        description: '',
        descriptionExtension: '',
        attributes: [],
        mainImage: null,
      })
      setDetailName(location.pathname, 'Neues Exponat')
    }
  }, [exhibitData, setDetailName, isNew, reset])

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
    if (isNew) {
      const result = await createExhibit({
        variables: {
          title: data.title,
          description: currentDescription,
          descriptionExtension: currentDescriptionExtension,
          table: data.table || null,
          attributes: validAttributes.length > 0 ? validAttributes : undefined,
        },
      })
      const {
        id: savedId,
        description: savedDescription,
        descriptionExtension: savedDescriptionExtension,
        attributes: savedAttributes,
      } = result.data!.createExhibit!
      navigate(`/user/exhibit/${savedId}`)
      setValue('description', savedDescription!)
      setValue('descriptionExtension', savedDescriptionExtension!)
      setValue('attributes', (savedAttributes as Attribute[]) || [])
    } else {
      const result = await updateExhibit({
        variables: {
          id: Number(id),
          title: data.title,
          description: currentDescription,
          descriptionExtension: currentDescriptionExtension,
          table: data.table || null,
          attributes: validAttributes.length > 0 ? validAttributes : undefined,
        },
      })
      const {
        description: savedDescription,
        descriptionExtension: savedDescriptionExtension,
        attributes: savedAttributes,
      } = result.data!.updateExhibit!
      setValue('description', savedDescription!)
      setValue('descriptionExtension', savedDescriptionExtension!)
      setValue('attributes', (savedAttributes as Attribute[]) || [])
    }
  }

  const handleDelete = async () => {
    await deleteExhibit({ variables: { id: Number(id) } })
    await apolloClient.clearStore()
    navigate('/user/exhibit')
  }

  const handlePdfClick = async () => {
    if (isPdfGenerating) return

    try {
      setIsPdfGenerating(true)

      // Get the current full URL for the QR code
      const currentUrl = window.location.href

      await generateAndDownloadPDF({
        id: parseInt(id!),
        client: apolloClient,
        url: currentUrl,
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsPdfGenerating(false)
    }
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

              {!isNew && tables.length > 0 && (
                <>
                  <FormLabel>Tisch</FormLabel>
                  <select
                    value={watch('table') || ''}
                    onChange={handleTableChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-blue-500">
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

          <ActionBar>
            <Button type="submit" disabled={!isDirty || !watch('title').trim()}>
              {isNew ? 'Erstellen' : 'Speichern'}
            </Button>
            {!isNew && (
              <Button
                onClick={handlePdfClick}
                disabled={isPdfGenerating || isDirty}
                variant="secondary"
                icon="pdf"
                title="Als PDF speichern (Shift+Klick öffnet im Browser)">
                PDF
              </Button>
            )}
            {!isNew && (
              <Button onClick={() => setShowDeleteConfirm(true)} variant="danger">
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
    </>
  )
}

export default ExhibitEditor
