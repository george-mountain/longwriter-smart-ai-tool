import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Row, Col, Modal } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import { FaCopy, FaFilePdf, FaEdit, FaSave } from "react-icons/fa";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { unified } from "unified";
import remarkParse from "remark-parse";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const StreamingClient = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableResponse, setEditableResponse] = useState("");
  const [pdfHeader, setPdfHeader] = useState("");
  const [showPdfHeaderModal, setShowPdfHeaderModal] = useState(false);
  const responseAreaRef = useRef(null);

  useEffect(() => {
    if (responseAreaRef.current) {
      responseAreaRef.current.scrollTop = responseAreaRef.current.scrollHeight;
    }
  }, [response]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResponse("");
    setIsStreaming(true);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/generate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  controller.close();
                  setIsStreaming(false);
                  return;
                }
                const newText = decoder.decode(value, { stream: true });
                setResponse((prev) => prev + newText);
                controller.enqueue(value);
                push();
              })
              .catch((error) => {
                setResponse("Error: " + error.message);
                setIsStreaming(false);
              });
          }
          push();
        },
      });

      const responseStream = new Response(stream);
      await responseStream.text();
    } catch (error) {
      setResponse("Error: " + error.message);
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    if (responseAreaRef.current) {
      navigator.clipboard.writeText(responseAreaRef.current.innerText);
      alert("Response copied to clipboard!");
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setEditableResponse(response);
  };

  const handleSaveEdit = () => {
    setResponse(editableResponse);
    setIsEditing(false);
  };

  const generatePdfFileName = () => {
    const now = new Date();
    const formattedDate = now
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")
      .replace("T", "_");
    return `response_${formattedDate}.pdf`;
  };

  const handleExportPdf = () => {
    setShowPdfHeaderModal(true);
  };

  const handlePdfHeaderSubmit = () => {
    setShowPdfHeaderModal(false);
  };

  // Define styles for the PDF document
  const styles = StyleSheet.create({
    page: {
      padding: 30,
    },
    header: {
      fontSize: 18,
      textAlign: "center",
      marginBottom: 20,
    },
    footer: {
      fontSize: 12,
      textAlign: "center",
      position: "absolute",
      bottom: 30,
      width: "100%",
    },
    text: {
      fontSize: 12,
      marginBottom: 10,
      textAlign: "justify",
    },
    code: {
      fontFamily: "Courier",
      fontSize: 10,
      backgroundColor: "#f4f4f4",
      padding: 10,
      borderRadius: 5,
    },
    heading1: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 10,
    },
    heading2: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 8,
    },
    blockquote: {
      fontStyle: "italic",
      color: "#555",
      margin: 10,
      padding: 10,
      borderLeftWidth: 3,
      borderLeftColor: "#ccc",
    },
  });

  // Function to map Markdown nodes to PDF components
  const renderMarkdownToPdf = (node, index) => {
    switch (node.type) {
      case "text":
        return (
          <Text key={index} style={styles.text}>
            {node.value}
          </Text>
        );
      case "paragraph":
        return (
          <View key={index}>
            {node.children.map((child, idx) => renderMarkdownToPdf(child, idx))}
          </View>
        );
      case "heading":
        const headingStyle =
          node.depth === 1 ? styles.heading1 : styles.heading2;
        return (
          <Text key={index} style={headingStyle}>
            {node.children.map((child, idx) => renderMarkdownToPdf(child, idx))}
          </Text>
        );
      case "strong":
        return (
          <Text key={index} style={{ fontWeight: "bold" }}>
            {node.children.map((child, idx) => renderMarkdownToPdf(child, idx))}
          </Text>
        );
      case "emphasis":
        return (
          <Text key={index} style={{ fontStyle: "italic" }}>
            {node.children.map((child, idx) => renderMarkdownToPdf(child, idx))}
          </Text>
        );
      case "list":
        return (
          <View key={index}>
            {node.children.map((child, idx) => renderMarkdownToPdf(child, idx))}
          </View>
        );
      case "listItem":
        return (
          <Text key={index} style={{ marginLeft: 10 }}>
            •{" "}
            {node.children.map((child, idx) => renderMarkdownToPdf(child, idx))}
          </Text>
        );
      case "code":
        return (
          <Text key={index} style={styles.code}>
            {node.value}
          </Text>
        );
      case "blockquote":
        return (
          <Text key={index} style={styles.blockquote}>
            {node.children.map((child, idx) => renderMarkdownToPdf(child, idx))}
          </Text>
        );
      default:
        return <Text key={index}>{node.type}</Text>;
    }
  };

  // PDF Document Component
  const MyDocument = ({ prompt, pdfHeader }) => {
    const markdownAst = unified().use(remarkParse).parse(response);

    return (
      <Document>
        <Page style={styles.page}>
          <Text style={styles.header}>{pdfHeader || prompt}</Text>
          <View>
            {markdownAst.children.map((node, index) => (
              <View key={index}>{renderMarkdownToPdf(node, index)}</View>
            ))}
          </View>
          <Text style={styles.footer}>
            Copyright: George Mountain, {new Date().getFullYear()}
          </Text>
        </Page>
      </Document>
    );
  };

  return (
    <div className="main-container">
      <div className="content">
        <div className="container">
          <Row className="justify-content-center">
            <Col xs={12} md={8} lg={6}>
              <h2 className="text-center">Long Context Smart Writing Tool</h2>
              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formPrompt">
                  <Form.Label>Enter your prompt:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Enter prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  type="submit"
                  className="btn-primary mt-3 w-100"
                >
                  Generate
                </Button>
              </Form>

              {response && (
                <div className="mt-4 position-relative">
                  <h3>Response:</h3>
                  {isEditing ? (
                    <div className="border p-3">
                      <Form.Control
                        as="textarea"
                        rows={10}
                        value={editableResponse}
                        onChange={(e) => setEditableResponse(e.target.value)}
                      />
                      <Button
                        variant="success"
                        onClick={handleSaveEdit}
                        className="mt-2"
                      >
                        <FaSave /> Save
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border p-3 response-area"
                      ref={responseAreaRef}
                      style={{ maxHeight: "400px", overflowY: "auto" }}
                    >
                      <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                  )}

                  {!isStreaming && (
                    <div className="button-group">
                      <Button variant="outline-secondary" onClick={handleCopy}>
                        <FaCopy /> Copy
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={handleEditToggle}
                      >
                        <FaEdit /> {isEditing ? "Cancel Edit" : "Edit Content"}
                      </Button>
                      <Button
                        variant="outline-primary"
                        onClick={handleExportPdf}
                      >
                        <FaFilePdf /> Export as PDF
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Col>
          </Row>
        </div>
      </div>

      <Modal
        show={showPdfHeaderModal}
        onHide={() => setShowPdfHeaderModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Enter PDF Header</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="formPdfHeader">
            <Form.Label>PDF Header:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter PDF header"
              value={pdfHeader}
              onChange={(e) => setPdfHeader(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPdfHeaderModal(false)}
          >
            Close
          </Button>
          <PDFDownloadLink
            document={
              <MyDocument prompt={prompt} pdfHeader={pdfHeader || prompt} />
            }
            fileName={generatePdfFileName()}
            className="btn btn-primary"
            onClick={handlePdfHeaderSubmit}
          >
            Download PDF
          </PDFDownloadLink>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default StreamingClient;
