package helper

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"fmt"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/cons"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/google/uuid"
	"github.com/mholt/archiver/v3"
	"go.uber.org/zap"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/transform"
	"io"
	"io/fs"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"unicode/utf8"
)

func CalculateTotalSize(dirPath string) (int64, error) {
	var totalSize int64

	err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil // 跳过目录
		}

		info, err := d.Info()
		if err != nil {
			return err
		}

		totalSize += info.Size()

		return nil
	})

	if err != nil {
		return 0, err
	}

	return totalSize, nil
}

func CopyDir(srcDir, destDir string) error {
	// 遍历源目录
	err := filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden files and directories starting with "."
		if info.Name() != srcDir && (strings.HasPrefix(info.Name(), ".") || strings.HasPrefix(info.Name(), "_")) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// 如果是目录，则创建目录并移动
		if info.IsDir() {
			// 获取目标目录下的子目录
			subDir := filepath.Join(destDir, path[len(srcDir):])
			// 创建目标目录下的子目录
			err := os.MkdirAll(subDir, os.ModePerm)
			if err != nil {
				return err
			}

			// 复制目录下的文件
			return copyDir(path, subDir)
		}

		return nil
	})

	if err != nil {
		logz.Error("CopyDir error"+err.Error(), zap.String("srcDir", srcDir), zap.String("destDir", destDir))
	}
	return err
}

// 复制目录
func copyDir(src string, dest string) error {
	// 遍历源目录下的所有文件
	files, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, file := range files {
		srcPath := filepath.Join(src, file.Name())
		destPath := filepath.Join(dest, file.Name())
		// 忽略隐藏文件
		if strings.HasPrefix(file.Name(), ".") || strings.HasPrefix(file.Name(), "_") {
			continue
		}

		if file.IsDir() {
			err := os.MkdirAll(destPath, os.ModePerm)
			if err != nil {
				return err
			}
			// 如果是目录，则递归复制
			err = copyDir(srcPath, destPath)
			if err != nil {
				return err
			}
		} else {
			// 如果是文件，则复制文件
			err := copyFile(srcPath, destPath)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// 复制文件
func copyFile(src string, dest string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	destFile, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, srcFile)
	if err != nil {
		return err
	}

	return nil
}

func MergeFile(tempDir, fileName string) (string, error) {
	// 获取所有分片文件
	chunksDir := filepath.Join(tempDir)
	chunkFiles, err := filepath.Glob(filepath.Join(chunksDir, "*"))
	if err != nil {
		return "", err
	}

	// 按照分片编号排序
	//sort.Strings(chunkFiles)
	sort.Sort(ByNumber(chunkFiles))

	logz.Info("ByNumber MergeFile chunksDir:" + chunksDir + ",chunkFiles: [" + strings.Join(chunkFiles, ",") + "]")

	// 创建目标文件
	dstFilePath := filepath.Join(tempDir, fileName)
	dstFile, err := os.Create(dstFilePath)
	if err != nil {
		logz.Error("mergeFile error:"+err.Error(), zap.String("dstFilePath", dstFilePath))
		return "", err
	}
	defer dstFile.Close()

	// 将所有分片文件内容拼接成完整文件
	for _, chunkFile := range chunkFiles {
		chunk, err := os.Open(chunkFile)
		if err != nil {
			logz.Error("mergeFile error:"+err.Error(), zap.String("chunkFile", chunkFile))
			return "", err
		}
		defer chunk.Close()

		_, err = io.Copy(dstFile, chunk)
		if err != nil {
			logz.Error("mergeFile error:"+err.Error(), zap.String("chunkFile", chunkFile))
			return "", err
		}

		// 删除分片文件
		err = os.Remove(chunkFile)
		if err != nil {
			logz.Error("mergeFile error:"+err.Error(), zap.String("chunkFile", chunkFile))
			return "", err
		}
	}
	logz.Info("mergeFile successed!" + chunksDir)
	return dstFilePath, nil
}

func ExtractFile(tempDir, fileName, destDir string) (int64, error) {
	// 解压缩文件
	ext := filepath.Ext(fileName)
	switch strings.ToLower(ext) {
	case ".zip":
		return extractZip(tempDir, fileName, destDir)
	case ".tar":
		return extractTar(tempDir, fileName, destDir)
	case ".gz":
		if strings.HasSuffix(fileName, ".tar.gz") {
			return extractTarGz(tempDir, fileName, destDir)
		} else {
			logz.Error("不支持的文件后缀：" + fileName)
			return 0, cons.ErrBadExtension
		}
	case ".rar":
		return extractRar(tempDir, fileName, destDir)
	default:
		logz.Error("不支持的文件后缀：" + fileName)
		return 0, cons.ErrBadExtension
	}
}

func extractZip(tempDir, fileName, destDir string) (int64, error) {
	// 打开压缩包
	zipFile, err := zip.OpenReader(filepath.Join(tempDir, fileName))
	if err != nil {
		return 0, err
	}
	defer zipFile.Close()
	var totalSize int64

	// 解压缩所有文件到目标文件夹
	for _, file := range zipFile.File {
		src, err := file.Open()
		if err != nil {
			return 0, err
		}
		defer src.Close()

		decodeName := ""
		if utf8.ValidString(file.Name) == false {
			//如果标致位是0  则是默认的本地编码   默认为gbk
			i := bytes.NewReader([]byte(file.Name))
			decoder := transform.NewReader(i, simplifiedchinese.GB18030.NewDecoder())
			content, _ := ioutil.ReadAll(decoder)
			decodeName = string(content)
		} else {
			//如果标志为是 1 << 11也就是 2048  则是utf-8编码
			decodeName = file.Name
		}
		if strings.HasPrefix(decodeName, ".") || strings.HasPrefix(decodeName, "_") {
			continue
		}

		dstPath := filepath.Join(destDir, decodeName)
		if strings.HasPrefix(decodeName, ".") || strings.HasPrefix(decodeName, "_") {
			continue
		}
		if file.FileInfo().IsDir() {
			err = os.MkdirAll(dstPath, file.Mode())
			if err != nil {
				return 0, err
			}
		} else {
			dstDir := filepath.Dir(dstPath)
			err = os.MkdirAll(dstDir, os.ModePerm)
			if err != nil {
				return 0, err
			}

			dstFile, err := os.OpenFile(dstPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
			if err != nil {
				return 0, err
			}
			defer dstFile.Close()

			n, err := io.Copy(dstFile, src)
			if err != nil {
				return 0, err
			}
			totalSize += n
		}
	}
	logz.Info("extract .Zip successed!", zap.String("fileName", fileName))
	return totalSize, nil
}

func extractTar(tempDir, fileName, destDir string) (int64, error) {
	// Open the tar file for reading
	file, err := os.Open(path.Join(tempDir, fileName))
	if err != nil {
		return 0, fmt.Errorf("failed to open tar file: %v", err)
	}
	defer file.Close()

	// Create a new tar reader
	tarReader := tar.NewReader(file)

	var totalSize int64

	// Iterate through the tar file contents
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, fmt.Errorf("failed to read tar header: %v", err)
		}

		// Determine the file path
		decodeName := ""
		if utf8.ValidString(header.Name) == false {
			//如果标致位是0  则是默认的本地编码   默认为gbk
			i := bytes.NewReader([]byte(header.Name))
			decoder := transform.NewReader(i, simplifiedchinese.GB18030.NewDecoder())
			content, _ := ioutil.ReadAll(decoder)
			decodeName = string(content)
		} else {
			//如果标志为是 1 << 11也就是 2048  则是utf-8编码
			decodeName = header.Name
		}
		if strings.HasPrefix(decodeName, ".") || strings.HasPrefix(decodeName, "_") {
			continue
		}
		dstPath := filepath.Join(destDir, decodeName)

		// Create directories as needed
		if header.Typeflag == tar.TypeDir {
			if err := os.MkdirAll(dstPath, 0755); err != nil {
				return 0, fmt.Errorf("failed to create directory: %v", err)
			}
			continue
		}

		// Create the file
		file, err := os.Create(dstPath)
		if err != nil {
			return 0, fmt.Errorf("failed to create file: %v", err)
		}

		// Write the file contents and increment the total size
		n, err := io.Copy(file, tarReader)
		if err != nil {
			file.Close()
			return 0, fmt.Errorf("failed to write file contents: %v", err)
		}
		totalSize += n

		// Close the file
		if err := file.Close(); err != nil {
			return 0, fmt.Errorf("failed to close file: %v", err)
		}
	}
	logz.Info("extract .tar successed!", zap.String("fileName", fileName))
	return totalSize, nil
}

func extractTarGz(tempDir, fileName, destDir string) (int64, error) {
	// Open the tar.gz file for reading
	file, err := os.Open(filepath.Join(tempDir, fileName))
	if err != nil {
		return 0, fmt.Errorf("failed to open tar.gz file: %v", err)
	}
	defer file.Close()
	var totalSize int64

	// Create a new gzip reader
	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return 0, fmt.Errorf("failed to create gzip reader: %v", err)
	}
	defer gzReader.Close()

	// Create a new tar reader
	tarReader := tar.NewReader(gzReader)

	// Iterate through the tar file contents
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, fmt.Errorf("failed to read tar header: %v", err)
		}

		// Determine the file path
		decodeName := ""
		if utf8.ValidString(header.Name) == false {
			//如果标致位是0  则是默认的本地编码   默认为gbk
			i := bytes.NewReader([]byte(header.Name))
			decoder := transform.NewReader(i, simplifiedchinese.GB18030.NewDecoder())
			content, _ := ioutil.ReadAll(decoder)
			decodeName = string(content)
		} else {
			//如果标志为是 1 << 11也就是 2048  则是utf-8编码
			decodeName = header.Name
		}
		if strings.HasPrefix(decodeName, ".") || strings.HasPrefix(decodeName, "_") {
			continue
		}

		dstPath := filepath.Join(destDir, decodeName)

		// Create directories as needed
		if header.Typeflag == tar.TypeDir {
			if err := os.MkdirAll(dstPath, 0755); err != nil {
				return 0, fmt.Errorf("failed to create directory: %v", err)
			}
			continue
		}

		// Create the file
		file, err := os.Create(dstPath)
		if err != nil {
			return 0, fmt.Errorf("failed to create file: %v", err)
		}

		// Write the file contents
		n, err := io.Copy(file, tarReader)
		if err != nil {
			file.Close()
			return 0, fmt.Errorf("failed to write file contents: %v", err)
		}
		totalSize += n

		// Close the file
		if err := file.Close(); err != nil {
			return 0, fmt.Errorf("failed to close file: %v", err)
		}
	}
	logz.Info("extract .tar.gz successed!", zap.String("fileName", fileName))
	return totalSize, nil
}

func extractRar(tempDir, fileName, destDir string) (int64, error) {
	// 获取 RAR 文件的完整路径
	filePath := filepath.Join(tempDir, fileName)

	// 解压 RAR 文件到临时目录
	fid := uuid.New().String()
	extractDir := filepath.Join(tempDir, fid)
	os.MkdirAll(extractDir, os.ModePerm)
	err := archiver.Unarchive(filePath, extractDir)

	if err != nil {
		return 0, fmt.Errorf("failed to extract RAR file %s: %w", filePath, err)
	}
	err = os.Remove(filePath)
	if err != nil {
		return 0, fmt.Errorf("failed to remove RAR file %s: %w", filePath, err)
	}

	// 读取临时目录下的所有文件
	files, err := os.ReadDir(extractDir)
	if err != nil {
		return 0, fmt.Errorf("failed to read directory %s: %w", tempDir, err)
	}

	// 移动解压后的文件到指定目录
	var totalSize int64 = 0
	for _, f := range files {
		decodeName := ""
		if utf8.ValidString(f.Name()) == false {
			//如果标致位是0  则是默认的本地编码   默认为gbk
			i := bytes.NewReader([]byte(f.Name()))
			decoder := transform.NewReader(i, simplifiedchinese.GB18030.NewDecoder())
			content, _ := ioutil.ReadAll(decoder)
			decodeName = string(content)
		} else {
			//如果标志为是 1 << 11也就是 2048  则是utf-8编码
			decodeName = f.Name()
		}
		if strings.HasPrefix(decodeName, ".") || strings.HasPrefix(decodeName, "_") {
			continue
		}
		srcPath := filepath.Join(extractDir, decodeName)
		destPath := filepath.Join(destDir, decodeName)
		err = os.Rename(srcPath, destPath)
		if err != nil {
			return 0, fmt.Errorf("failed to move file %s to %s: %w", srcPath, destPath, err)
		}
		fileInfo, err := os.Stat(destPath)
		if err != nil {
			return 0, fmt.Errorf("failed to get file info for %s: %w", destPath, err)
		}
		totalSize += fileInfo.Size()
	}
	err = os.RemoveAll(extractDir)
	if err != nil {
		logz.Error(fmt.Sprintf("failed to remove temp file %s: %w", extractDir, err))
	}
	logz.Info("extract .rar successed!", zap.String("fileName", fileName))
	return totalSize, nil
}

func isExist(path string) bool {
	_, err := os.Stat(path)
	if err != nil {
		if os.IsExist(err) {
			return true
		}
		return false
	}
	return true
}

func CreateDir(tempDir string) error {
	if !isExist(tempDir) {
		err := os.MkdirAll(tempDir, os.ModePerm)
		return err
	}
	return nil
}

func PathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func IsDir(path string) (bool, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		logz.Error(path + ":" + err.Error())
		return false, err
	}

	if fileInfo.IsDir() {
		logz.Info(path + " is directory")
		return true, nil
	} else {
		logz.Info(path + " not a directory")
		return false, nil
	}
}
