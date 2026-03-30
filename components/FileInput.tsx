import React, { useCallback, useState } from 'react';
import { UploadIcon, FileIcon, CheckCircleIcon } from './Icons';
import { useTranslation } from '../LanguageContext';

interface FileInputProps {
    onFilesChange: (files: { tif?: File, tfw?: File, las?: File }) => void;
    files: { tif: File | null, tfw: File | null, las: File | null };
    fileError: string | null;
    isParsing: boolean;
}

const FileSlot: React.FC<{
    file: File | null;
    label: string;
    prompt: string;
    isDone: boolean;
}> = ({ file, label, prompt, isDone }) => (
    <div className={`flex-1 p-3 rounded-lg text-center ${isDone ? 'bg-teal-900/40' : 'bg-gray-700/50'}`}>
        <p className="text-sm font-semibold text-gray-300">{label}</p>
        {file ? (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-200">
                <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate" title={file.name}>{file.name}</span>
            </div>
        ) : (
            <p className="text-xs text-gray-500 mt-2">{prompt}</p>
        )}
    </div>
);

export const FileInput: React.FC<FileInputProps> = ({ onFilesChange, files, fileError, isParsing }) => {
    const [isDragging, setIsDragging] = useState(false);
    const { t } = useTranslation();

    const processFiles = useCallback((fileList: FileList | null) => {
        if (!fileList || isParsing) return;
        
        let tifFile: File | undefined;
        let tfwFile: File | undefined;

        for (const file of Array.from(fileList)) {
            if (/\.(tiff?)$/i.test(file.name)) {
                tifFile = file;
            } else if (/\.tfw$/i.test(file.name)) {
                tfwFile = file;
            } else if (/\.(las|laz)$/i.test(file.name)) {
                // Handle LAS file
                onFilesChange({ tif: tifFile, tfw: tfwFile, las: file });
                return;
            }
        }
        
        if (tifFile || tfwFile) {
            onFilesChange({ tif: tifFile, tfw: tfwFile });
        }

    }, [isParsing, onFilesChange]);

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); if (!isParsing) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            processFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    }, [processFiles]);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files);
        e.target.value = '';
    };

    const hasTif = !!files.tif;
    const isComplete = hasTif && (fileError === null || !fileError.includes('tfw_required'));

    const borderColor = isComplete ? 'border-teal-500' : isDragging ? 'border-blue-500' : 'border-gray-600';
    const bgColor = isComplete ? 'bg-teal-900/20' : isDragging ? 'bg-blue-900/20' : 'bg-gray-900/30';
    
    return (
        <div className="w-full">
            <label
                htmlFor="unified-upload"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-6 border-2 ${borderColor} border-dashed rounded-lg ${isParsing ? 'cursor-not-allowed' : 'cursor-pointer'} ${bgColor} hover:bg-gray-700/50 transition-colors duration-300 min-h-[192px]`}
            >
                <div className="flex flex-col items-center justify-center text-center">
                    {isComplete && hasTif ? (
                        <>
                            <CheckCircleIcon className="w-10 h-10 mb-4 text-teal-400"/>
                            <p className="font-semibold text-gray-300">{t('fileInputSelected')}</p>
                        </>
                    ) : (
                         <>
                            <UploadIcon className="w-10 h-10 mb-4 text-gray-500"/>
                            <p className="font-semibold text-gray-400">{t('fileInputTitle')}</p>
                        </>
                    )}
                </div>

                <div className="w-full max-w-md mt-4 flex gap-3">
                    <FileSlot file={files.tif} label=".tif" prompt={t('fileSlotEmpty')} isDone={!!files.tif} />
                    <FileSlot file={files.tfw} label=".tfw" prompt={t(fileError ? 'fileSlotOptional' : 'fileSlotEmpty')} isDone={!!files.tfw} />
                    <FileSlot file={null} label=".las" prompt="Upload LAS" isDone={false} />
                </div>

                <input id="unified-upload" type="file" className="hidden" onChange={handleFileChange} multiple accept=".tif,.tiff,.tfw,.ovr,.xml,.aux.xml,.las,.laz" disabled={isParsing} />
            </label>
            {fileError && (
                 <div className="text-center mt-4 text-yellow-300 bg-yellow-900/50 border border-yellow-700 px-4 py-3 rounded-lg text-sm">
                    <span className="font-semibold">{t('errorPrefix')}</span> {fileError}
                </div>
            )}
        </div>
    );
};
